package database

import (
	"context"
	_ "embed"

	shareddb "e-kyc/shared/db"

	"github.com/jackc/pgx/v5/pgxpool"
)

var schemaSQL string

func SetupSchemaAndSeed(ctx context.Context, pool *pgxpool.Pool) error {
	if err := shareddb.ApplySchema(ctx, pool, schemaSQL); err != nil {
		return err
	}
	return shareddb.SeedBackoffice(ctx, pool)
}
