package db

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ApplySchema splits the provided SQL blob into individual statements and executes them sequentially.
func ApplySchema(ctx context.Context, pool *pgxpool.Pool, sqlBlob string) error {
	statements := splitStatements(sqlBlob)
	for _, stmt := range statements {
		if _, err := pool.Exec(ctx, stmt); err != nil {
			return fmt.Errorf("apply schema statement failed: %w", err)
		}
	}
	return nil
}

// WithTx executes fn inside a transaction, rolling back on error.
func WithTx(ctx context.Context, pool *pgxpool.Pool, fn func(pgx.Tx) error) error {
	tx, err := pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := fn(tx); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}
	return nil
}

func splitStatements(sqlBlob string) []string {
	raw := strings.Split(sqlBlob, ";")
	statements := make([]string, 0, len(raw))
	for _, stmt := range raw {
		trimmed := strings.TrimSpace(stmt)
		if trimmed == "" {
			continue
		}
		statements = append(statements, trimmed)
	}
	return statements
}

// CleanDatabase resets the public schema so migrations can recreate everything from scratch.
func CleanDatabase(ctx context.Context, pool *pgxpool.Pool) error {
	statements := []string{
		`DROP SCHEMA IF EXISTS public CASCADE`,
		`CREATE SCHEMA IF NOT EXISTS public`,
		`GRANT ALL ON SCHEMA public TO PUBLIC`,
	}
	for _, stmt := range statements {
		if _, err := pool.Exec(ctx, stmt); err != nil {
			return fmt.Errorf("clean schema failed executing %q: %w", stmt, err)
		}
	}
	return nil
}
