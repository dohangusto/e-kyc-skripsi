package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	domain "e-kyc/services/api-backoffice/internal/domain"
)

var (
	ErrInvalidCredential = errors.New("invalid credential")
)

type AuthService struct {
	repo           domain.AuthRepository
	tokenManager   SessionTokenManager
	adminTTL       time.Duration
	beneficiaryTTL time.Duration
}

type SessionTokenManager interface {
	Create(userID, role string, regionScope []string, ttl time.Duration) (domain.Session, error)
	Parse(token string) (*domain.Session, error)
}

var _ domain.AuthService = (*AuthService)(nil)

func NewAuthService(repo domain.AuthRepository, tokenManager SessionTokenManager) *AuthService {
	return &AuthService{
		repo:           repo,
		tokenManager:   tokenManager,
		adminTTL:       12 * time.Hour,
		beneficiaryTTL: 48 * time.Hour,
	}
}

func (s *AuthService) SetAdminTTL(ttl time.Duration) {
	if ttl > 0 {
		s.adminTTL = ttl
	}
}

func (s *AuthService) SetBeneficiaryTTL(ttl time.Duration) {
	if ttl > 0 {
		s.beneficiaryTTL = ttl
	}
}

func (s *AuthService) LoginAdmin(ctx context.Context, nik, pin string) (*domain.AuthResult, error) {
	nik = strings.TrimSpace(nik)
	pin = strings.TrimSpace(pin)
	if nik == "" || pin == "" {
		return nil, ErrInvalidCredential
	}

	cred, err := s.repo.FindAdminByNIK(ctx, nik)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, ErrInvalidCredential
		}
		return nil, err
	}

	if !verifyPIN(cred.PINHash, pin) {
		return nil, ErrInvalidCredential
	}

	sess, err := s.tokenManager.Create(cred.User.ID, cred.User.Role, cred.User.RegionScope, s.adminTTL)
	if err != nil {
		return nil, err
	}
	return &domain.AuthResult{Session: sess, User: cred.User}, nil
}

func (s *AuthService) LoginBeneficiary(ctx context.Context, phone, pin string) (*domain.AuthResult, error) {
	phone = strings.TrimSpace(phone)
	pin = strings.TrimSpace(pin)
	if phone == "" || pin == "" {
		return nil, ErrInvalidCredential
	}

	cred, err := s.repo.FindBeneficiaryByPhone(ctx, phone)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, ErrInvalidCredential
		}
		return nil, err
	}

	if !verifyPIN(cred.PINHash, pin) {
		return nil, ErrInvalidCredential
	}

	sess, err := s.tokenManager.Create(cred.User.ID, cred.User.Role, cred.User.RegionScope, s.beneficiaryTTL)
	if err != nil {
		return nil, err
	}
	return &domain.AuthResult{Session: sess, User: cred.User}, nil
}

func (s *AuthService) Validate(token string) (*domain.Session, bool) {
	sess, err := s.tokenManager.Parse(token)
	if err != nil {
		return nil, false
	}
	return sess, true
}

func (s *AuthService) CheckBeneficiaryEligibility(ctx context.Context, name, nik string) (*domain.User, error) {
	name = strings.TrimSpace(name)
	nik = strings.TrimSpace(nik)
	if name == "" || nik == "" {
		return nil, ErrInvalidCredential
	}
	cred, err := s.repo.FindEligibleBeneficiary(ctx, name, nik)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, ErrInvalidCredential
		}
		return nil, err
	}
	return &cred.User, nil
}

func verifyPIN(hash, provided string) bool {
	if hash == "" {
		return false
	}
	return hash == fmt.Sprintf("plain:%s", provided)
}
