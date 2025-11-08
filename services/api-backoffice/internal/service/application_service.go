package service

import (
	"context"

	domain "e-kyc/services/api-backoffice/internal/domain"
	types "e-kyc/services/api-backoffice/pkg/types"
)

type applicationService struct {
	repo domain.ApplicationRepository
}

func NewApplicationService(repo domain.ApplicationRepository) domain.ApplicationService {
	return &applicationService{repo: repo}
}

func (svc *applicationService) ListApplications(ctx context.Context) ([]types.ApplicationSummary, error) {
	return svc.repo.ListApplications(ctx)
}
