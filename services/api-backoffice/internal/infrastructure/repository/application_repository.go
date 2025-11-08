package repository

import (
	"context"

	domain "e-kyc/services/api-backoffice/internal/domain"
	types "e-kyc/services/api-backoffice/pkg/types"

	"github.com/jackc/pgx/v5/pgxpool"
)

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
	if repo.db == nil {
		out := make([]types.ApplicationSummary, len(repo.seed))
		copy(out, repo.seed)
		return out, nil
	}

	rows, err := repo.db.Query(ctx, `
		SELECT a.id, u.name, a.status
		FROM applications a
		JOIN users u ON u.id = a.beneficiary_user_id
		ORDER BY a.created_at DESC
		LIMIT 200`,
	)
	if err != nil {
		if len(repo.seed) > 0 {
			out := make([]types.ApplicationSummary, len(repo.seed))
			copy(out, repo.seed)
			return out, nil
		}
		return nil, err
	}
	defer rows.Close()

	results := make([]types.ApplicationSummary, 0)
	for rows.Next() {
		var item types.ApplicationSummary
		if err := rows.Scan(&item.ID, &item.ApplicantName, &item.Status); err != nil {
			return nil, err
		}
		results = append(results, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	if len(results) == 0 && len(repo.seed) > 0 {
		out := make([]types.ApplicationSummary, len(repo.seed))
		copy(out, repo.seed)
		return out, nil
	}
	return results, nil
}
