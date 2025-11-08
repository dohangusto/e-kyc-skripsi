package repository

import (
	"context"

	domain "e-kyc/services/api-backoffice/internal/domain"
	types "e-kyc/services/api-backoffice/pkg/types"

	"github.com/jackc/pgx/v5/pgxpool"
)

// applicationRepository currently keeps seed data in-memory for quick API
// prototyping. Swap it with a database-backed implementation later on.
type applicationRepository struct {
	seed []types.ApplicationSummary
	db   *pgxpool.Pool
}

func NewApplicationRepository(seed []types.ApplicationSummary, pool *pgxpool.Pool) domain.ApplicationRepository {
	if len(seed) == 0 {
		seed = []types.ApplicationSummary{
			{ID: "APP-2024-0001", ApplicantName: "Siti Rahma", Status: "SUBMITTED"},
			{ID: "APP-2024-0002", ApplicantName: "Budi Santoso", Status: "IN_REVIEW"},
			{ID: "APP-2024-0003", ApplicantName: "Rina Pratama", Status: "APPROVED"},
		}
	}

	return &applicationRepository{
		seed: seed,
		db:   pool,
	}
}

func (repo *applicationRepository) ListApplications(ctx context.Context) ([]types.ApplicationSummary, error) {
	_ = ctx // placeholder for tracing/timeouts when persistence is added

	out := make([]types.ApplicationSummary, len(repo.seed))
	copy(out, repo.seed)
	return out, nil
}
