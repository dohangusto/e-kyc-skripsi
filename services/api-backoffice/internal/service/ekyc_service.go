package service

import (
	"context"
	"fmt"
	"strings"

	domain "e-kyc/services/api-backoffice/internal/domain"
)

type EkycService struct {
	repo domain.EkycRepository
}

var _ domain.EkycService = (*EkycService)(nil)

func NewEkycService(repo domain.EkycRepository) *EkycService {
	return &EkycService{repo: repo}
}

func (s *EkycService) CreateSession(ctx context.Context, params domain.CreateEkycSessionParams) (*domain.EkycSession, error) {
	return s.repo.CreateEkycSession(ctx, params)
}

func (s *EkycService) UpdateArtifacts(ctx context.Context, params domain.UpdateEkycArtifactsParams) (*domain.EkycSession, error) {
	return s.repo.UpdateEkycSession(ctx, params)
}

func (s *EkycService) RecordFaceChecks(ctx context.Context, params domain.SaveFaceChecksParams) (*domain.EkycSession, error) {
	return s.repo.SaveFaceChecks(ctx, params)
}

func (s *EkycService) RecordLiveness(ctx context.Context, params domain.SaveLivenessResultParams) (*domain.EkycSession, error) {
	return s.repo.SaveLivenessResult(ctx, params)
}

func (s *EkycService) AssignApplicant(ctx context.Context, params domain.ApplicantSubmission) (*domain.EkycSession, error) {
	if params.SessionID == "" {
		return nil, fmt.Errorf("session id wajib diisi")
	}
	if params.FullName == "" {
		return nil, fmt.Errorf("nama lengkap wajib diisi")
	}
	if params.Phone == "" && params.Nik == "" {
		return nil, fmt.Errorf("minimal salah satu dari nomor HP atau NIK wajib diisi")
	}
	return s.repo.AssignUserToSession(ctx, params)
}

func (s *EkycService) ListSessions(ctx context.Context, params domain.ListEkycSessionsParams) ([]domain.EkycSession, error) {
	return s.repo.ListEkycSessions(ctx, params)
}

func (s *EkycService) GetSession(ctx context.Context, id string) (*domain.EkycSession, error) {
	return s.repo.GetEkycSession(ctx, id)
}

func (s *EkycService) FinalizeSession(ctx context.Context, id string) (*domain.EkycSession, error) {
	session, err := s.repo.GetEkycSession(ctx, id)
	if err != nil {
		return nil, err
	}
	if !strings.EqualFold(session.FaceMatchingStatus, "DONE") || session.FaceMatchOverall == nil {
		return nil, fmt.Errorf("face matching belum selesai")
	}
	if !strings.EqualFold(session.LivenessStatus, "DONE") || session.LivenessOverall == nil {
		return nil, fmt.Errorf("liveness belum selesai")
	}

	face := strings.ToUpper(*session.FaceMatchOverall)
	live := strings.ToUpper(*session.LivenessOverall)
	finalDecision := "REJECTED"
	var reason *string

	if face == "PASS" && live == "PASS" {
		finalDecision = "APPROVED"
	} else {
		text := "Face match atau liveness gagal"
		if face != "PASS" && live == "PASS" {
			text = "Face match gagal"
		} else if face == "PASS" && live != "PASS" {
			text = "Liveness gagal"
		}
		reason = &text
	}

	return s.repo.UpdateEkycDecision(ctx, domain.UpdateEkycDecisionParams{
		SessionID:     id,
		FinalDecision: finalDecision,
		Reason:        reason,
	})
}

func (s *EkycService) OverrideDecision(ctx context.Context, params domain.UpdateEkycDecisionParams) (*domain.EkycSession, error) {
	return s.repo.UpdateEkycDecision(ctx, params)
}
