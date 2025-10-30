package service

import (
	"context"
	domain "e-kyc/services/api-gateway/internal/domain"
)

type faceMatchingService struct {
	repo domain.FaceMatchingRepository
}

func NewFaceMatchingService(repo domain.FaceMatchingRepository) *faceMatchingService {
	return &faceMatchingService{
		repo: repo,
	}
}

func (svc *faceMatchingService) Create(ctx context.Context) (err error) {
	return nil
}
