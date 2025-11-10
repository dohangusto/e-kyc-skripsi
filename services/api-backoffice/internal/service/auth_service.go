package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	domain "e-kyc/services/api-backoffice/internal/domain"

	"github.com/google/uuid"
)

var (
	ErrInvalidCredential = errors.New("invalid credential")
)

type AuthService struct {
	repo     domain.AuthRepository
	sessions *SessionStore
}

var _ domain.AuthService = (*AuthService)(nil)

func NewAuthService(repo domain.AuthRepository) *AuthService {
	return &AuthService{repo: repo, sessions: NewSessionStore()}
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

	sess := s.sessions.Create(cred.User.ID, cred.User.Role, cred.User.RegionScope)
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

	sess := s.sessions.Create(cred.User.ID, cred.User.Role, cred.User.RegionScope)
	return &domain.AuthResult{Session: sess, User: cred.User}, nil
}

func (s *AuthService) Validate(token string) (*domain.Session, bool) {
	return s.sessions.Get(token)
}

type SessionStore struct {
	mu   sync.RWMutex
	data map[string]domain.Session
}

func NewSessionStore() *SessionStore {
	return &SessionStore{data: make(map[string]domain.Session)}
}

func (s *SessionStore) Create(userID, role string, regionScope []string) domain.Session {
	s.mu.Lock()
	defer s.mu.Unlock()

	sess := domain.Session{
		Token:       uuid.NewString(),
		UserID:      userID,
		Role:        role,
		RegionScope: append([]string{}, regionScope...),
		IssuedAt:    time.Now().UTC(),
	}
	s.data[sess.Token] = sess
	return sess
}

func (s *SessionStore) Get(token string) (*domain.Session, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	sess, ok := s.data[token]
	if !ok {
		return nil, false
	}
	return &sess, true
}

func verifyPIN(hash, provided string) bool {
	if hash == "" {
		return false
	}
	return hash == fmt.Sprintf("plain:%s", provided)
}
