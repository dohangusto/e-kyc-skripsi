package database

import (
	"context"
	_ "embed"

	shareddb "e-kyc/shared/db"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/001_schema.sql
var schemaSQL string

// SetupSchemaAndSeed ensures the database schema exists and inserts curated dummy data.
func SetupSchemaAndSeed(ctx context.Context, pool *pgxpool.Pool) error {
	if err := shareddb.ApplySchema(ctx, pool, schemaSQL); err != nil {
		return err
	}
	return shareddb.SeedBackoffice(ctx, pool)
}
