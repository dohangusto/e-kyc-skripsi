package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	shareddb "e-kyc/shared/db"

	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	defaultDSN      = "postgres://postgres:postgres@localhost:5432/ekyc_backoffice?sslmode=disable"
	defaultWorkbook = "shared/dataset/beneficiaries_dataset.xlsx"
	migrationsDir   = "shared/db/migrations"
)

func main() {
	var (
		dsnFlag         = flag.String("dsn", "", "Postgres connection string")
		workbookFlag    = flag.String("workbook", "", "Path to beneficiaries XLSX dataset")
		skipMigrateFlag = flag.Bool("skip-migrate", false, "Skip running SQL migrations")
		skipSeedFlag    = flag.Bool("skip-seed", false, "Skip running base seed data")
		skipDatasetFlag = flag.Bool("skip-dataset", false, "Skip syncing beneficiary dataset")
		cleanFlag       = flag.Bool("clean", false, "Drop and recreate schema before running migrations")
	)
	flag.Parse()

	dsn := firstNonEmpty(*dsnFlag, os.Getenv("BACKOFFICE_DB_DSN"), defaultDSN)
	workbook := firstNonEmpty(*workbookFlag, os.Getenv("BENEFICIARY_DATASET_PATH"), defaultWorkbook)

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		log.Fatalf("connect postgres: %v", err)
	}
	defer pool.Close()

	if *cleanFlag {
		log.Println("clean migration requested: resetting schema")
		if err := shareddb.CleanDatabase(ctx, pool); err != nil {
			log.Fatalf("clean database: %v", err)
		}
	}

	if !*skipMigrateFlag {
		if err := applyMigrations(ctx, pool); err != nil {
			log.Fatalf("apply migrations: %v", err)
		}
	}

	if !*skipSeedFlag {
		if err := shareddb.SeedBackoffice(ctx, pool); err != nil {
			log.Fatalf("seed backoffice: %v", err)
		}
	}

	if !*skipDatasetFlag {
		if err := syncDataset(ctx, pool, workbook); err != nil {
			log.Fatalf("sync dataset: %v", err)
		}
	}

	log.Println("clutch tasks completed successfully")
}

func applyMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		if os.IsNotExist(err) {
			log.Printf("migrations directory %s not found, skipping", migrationsDir)
			return nil
		}
		return fmt.Errorf("read migrations dir: %w", err)
	}

	var files []string
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".sql") {
			continue
		}
		files = append(files, filepath.Join(migrationsDir, e.Name()))
	}
	sort.Strings(files)

	for _, path := range files {
		sqlBlob, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", path, err)
		}
		log.Printf("applying migration %s", filepath.Base(path))
		if err := shareddb.ApplySchema(ctx, pool, string(sqlBlob)); err != nil {
			return fmt.Errorf("apply migration %s: %w", path, err)
		}
	}
	return nil
}

func syncDataset(ctx context.Context, pool *pgxpool.Pool, workbook string) error {
	start := time.Now()
	records, err := shareddb.LoadBeneficiaryDataset(workbook)
	if err != nil {
		return err
	}
	if len(records) == 0 {
		log.Println("dataset is empty, nothing to sync")
		return nil
	}
	log.Printf("syncing %d beneficiaries from %s", len(records), workbook)
	stats, err := shareddb.SyncBeneficiaries(ctx, pool, records)
	if err != nil {
		return err
	}
	log.Printf("users: %d inserted, %d reconciled · beneficiaries linked: %d", stats.UsersInserted, stats.UsersUpdated, stats.BeneficiariesLinked)
	log.Printf("dataset sync completed in %s", time.Since(start).Round(time.Millisecond))
	return nil
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}
