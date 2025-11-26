package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	shareddb "e-kyc/shared/db"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	defaultDSN      = "postgres://postgres:postgres@localhost:5432/ekyc_backoffice?sslmode=disable"
	defaultWorkbook = "shared/dataset/beneficiaries_dataset.xlsx"
)

func main() {
	var (
		dsnFlag      = flag.String("dsn", "", "Postgres connection string")
		workbookFlag = flag.String("workbook", "", "Path to beneficiaries XLSX dataset")
	)
	flag.Parse()

	dsn := firstNonEmpty(*dsnFlag, os.Getenv("BACKOFFICE_DB_DSN"), defaultDSN)
	workbook := firstNonEmpty(*workbookFlag, os.Getenv("BENEFICIARY_DATASET_PATH"), defaultWorkbook)

	ctx := context.Background()

	records, err := shareddb.LoadBeneficiaryDataset(workbook)
	if err != nil {
		log.Fatalf("load dataset: %v", err)
	}
	if len(records) == 0 {
		log.Println("dataset is empty, nothing to seed")
		return
	}

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		log.Fatalf("connect postgres: %v", err)
	}
	defer pool.Close()

	start := time.Now()
	log.Printf("Seeding %d beneficiaries from %s", len(records), workbook)
	if err := seedBeneficiaries(ctx, pool, records); err != nil {
		log.Fatalf("seed beneficiaries: %v", err)
	}
	log.Printf("Dataset sync completed in %s", time.Since(start).Round(time.Millisecond))
}

func seedBeneficiaries(ctx context.Context, pool *pgxpool.Pool, records []shareddb.DatasetRecord) error {
	tx, err := pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var newUsers, updatedUsers, newBeneficiaries int
	for _, rec := range records {
		userID, created, err := ensureUser(ctx, tx, rec)
		if err != nil {
			return fmt.Errorf("row %d (%s): ensure user: %w", rec.RowNo, rec.Nik, err)
		}
		if created {
			newUsers++
		} else {
			updatedUsers++
		}
		inserted, err := ensureBeneficiary(ctx, tx, userID, rec)
		if err != nil {
			return fmt.Errorf("row %d (%s): ensure beneficiary: %w", rec.RowNo, rec.Nik, err)
		}
		if inserted {
			newBeneficiaries++
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}

	log.Printf("users: %d inserted, %d reconciled · beneficiaries linked: %d", newUsers, updatedUsers, newBeneficiaries)
	return nil
}

func ensureUser(ctx context.Context, tx pgx.Tx, rec shareddb.DatasetRecord) (string, bool, error) {
	var id string
	err := tx.QueryRow(ctx, `SELECT id FROM users WHERE nik = $1`, rec.Nik).Scan(&id)
	switch err {
	case nil:
		if _, err := tx.Exec(ctx, `
			UPDATE users
			   SET name = $1,
			       metadata = metadata || jsonb_build_object('datasetRow', $2::int),
			       updated_at = NOW()
			 WHERE id = $3`,
			rec.Name,
			rec.RowNo,
			id,
		); err != nil {
			return "", false, fmt.Errorf("update user %s: %w", rec.Nik, err)
		}
		return id, false, nil
	default:
		if err != pgx.ErrNoRows {
			return "", false, fmt.Errorf("lookup user %s: %w", rec.Nik, err)
		}
	}

	var newID string
	err = tx.QueryRow(ctx, `
		INSERT INTO users (role, nik, name, metadata)
		VALUES (
			'BENEFICIARY',
			$1,
			$2,
			jsonb_build_object(
				'datasetRow', $3::int,
				'datasetSeededAt', $4::timestamptz
			)
		)
		RETURNING id`,
		rec.Nik,
		rec.Name,
		rec.RowNo,
		time.Now().UTC(),
	).Scan(&newID)
	if err != nil {
		return "", false, fmt.Errorf("insert user %s: %w", rec.Nik, err)
	}
	return newID, true, nil
}

func ensureBeneficiary(ctx context.Context, tx pgx.Tx, userID string, rec shareddb.DatasetRecord) (bool, error) {
	const (
		defaultPrimaryProgram   = "PBI"
		defaultSecondaryProgram = "PKH"
	)
	primaryProgram := defaultPrimaryProgram
	secondaryProgram := defaultSecondaryProgram
	mainRank := rec.RowNo
	supportRank := rec.RowNo

	tag, err := tx.Exec(ctx, `
		INSERT INTO beneficiaries (
			user_id,
			bansos_utama,
			ranking_bansos_utama,
			bansos_pendukung,
			ranking_bansos_pendukung,
			portal_flags
		)
		VALUES ($1,$2,$3,$4,$5,jsonb_build_object('datasetSeed', true))
		ON CONFLICT (user_id) DO UPDATE SET
			bansos_utama = EXCLUDED.bansos_utama,
			ranking_bansos_utama = EXCLUDED.ranking_bansos_utama,
			bansos_pendukung = EXCLUDED.bansos_pendukung,
			ranking_bansos_pendukung = EXCLUDED.ranking_bansos_pendukung,
			portal_flags = beneficiaries.portal_flags || EXCLUDED.portal_flags`,
		userID,
		primaryProgram,
		mainRank,
		secondaryProgram,
		supportRank,
	)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}
