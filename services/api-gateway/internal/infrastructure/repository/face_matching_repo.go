package repository

import (
	"context"
	domain "e-kyc/services/api-gateway/internal/domain"
)

type faceMatchingRepository struct {
	FaceMatchingModel *domain.FaceMatchingModel
}

func NewFaceMatchingRepository() *faceMatchingRepository {
	return &faceMatchingRepository{
		FaceMatchingModel: &domain.FaceMatchingModel{},
	}
}

func (repo *faceMatchingRepository) Create(ctx context.Context) (err error) {
	return nil
}
