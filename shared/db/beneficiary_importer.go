package db

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SyncBeneficiaries inserts/updates users and beneficiary rows from dataset records in a single transaction.
type SyncStats struct {
	UsersInserted       int
	UsersUpdated        int
	BeneficiariesLinked int
}

func SyncBeneficiaries(ctx context.Context, pool *pgxpool.Pool, records []DatasetRecord) (SyncStats, error) {
	var stats SyncStats
	err := WithTx(ctx, pool, func(tx pgx.Tx) error {
		for _, rec := range records {
			userID, created, err := ensureUser(ctx, tx, rec)
			if err != nil {
				return fmt.Errorf("row %d (%s): ensure user: %w", rec.RowNo, rec.Nik, err)
			}
			if created {
				stats.UsersInserted++
			} else {
				stats.UsersUpdated++
			}
			inserted, err := ensureBeneficiary(ctx, tx, userID, rec)
			if err != nil {
				return fmt.Errorf("row %d (%s): ensure beneficiary: %w", rec.RowNo, rec.Nik, err)
			}
			if inserted {
				stats.BeneficiariesLinked++
			}
		}
		return nil
	})
	return stats, err
}

func ensureUser(ctx context.Context, tx pgx.Tx, rec DatasetRecord) (string, bool, error) {
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

func ensureBeneficiary(ctx context.Context, tx pgx.Tx, userID string, rec DatasetRecord) (bool, error) {
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
