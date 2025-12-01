package main

import (
	"context"
	"flag"
	"log"
	"os"
	"strings"
	"time"

	shareddb "e-kyc/shared/db"

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
	stats, err := shareddb.SyncBeneficiaries(ctx, pool, records)
	if err != nil {
		log.Fatalf("seed beneficiaries: %v", err)
	}
	log.Printf("users: %d inserted, %d reconciled · beneficiaries linked: %d", stats.UsersInserted, stats.UsersUpdated, stats.BeneficiariesLinked)
	log.Printf("Dataset sync completed in %s", time.Since(start).Round(time.Millisecond))
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}
