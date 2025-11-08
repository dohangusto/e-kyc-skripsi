package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	domain "e-kyc/services/api-backoffice/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrInvalidCredential = errors.New("invalid credential")
)

type AuthService struct {
	db       *pgxpool.Pool
	sessions *SessionStore
}

type Session struct {
	Token       string    `json:"token"`
	UserID      string    `json:"userId"`
	Role        string    `json:"role"`
	RegionScope []string  `json:"regionScope"`
	IssuedAt    time.Time `json:"issuedAt"`
}

type AuthResult struct {
	Session Session     `json:"session"`
	User    domain.User `json:"user"`
}

func NewAuthService(db *pgxpool.Pool) *AuthService {
	return &AuthService{db: db, sessions: NewSessionStore()}
}

func (s *AuthService) LoginAdmin(ctx context.Context, nik, pin string) (*AuthResult, error) {
	var (
		u             domain.User
		dob           *time.Time
		phone         *string
		email         *string
		regionScope   []string
		metadataBytes []byte
		pinHash       string
	)

	nik = strings.TrimSpace(nik)
	pin = strings.TrimSpace(pin)
	if nik == "" || pin == "" {
		return nil, ErrInvalidCredential
	}

	query := `SELECT id, role, nik, name, dob, phone, email, pin_hash,
        region_prov, region_kab, region_kec, region_kel,
        region_scope, metadata
        FROM users
        WHERE nik = $1 AND role <> 'BENEFICIARY'
        LIMIT 1`

	row := s.db.QueryRow(ctx, query, nik)
	if err := row.Scan(&u.ID, &u.Role, &u.NIK, &u.Name, &dob, &phone, &email, &pinHash,
		&u.Region.Prov, &u.Region.Kab, &u.Region.Kec, &u.Region.Kel,
		&regionScope, &metadataBytes); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInvalidCredential
		}
		return nil, err
	}

	if !verifyPIN(pinHash, pin) {
		return nil, ErrInvalidCredential
	}

	u.DOB = dob
	u.Phone = phone
	u.Email = email
	u.RegionScope = regionScope
	if len(metadataBytes) > 0 {
		_ = json.Unmarshal(metadataBytes, &u.Metadata)
	}

	sess := s.sessions.Create(u.ID, u.Role, regionScope)
	return &AuthResult{Session: sess, User: u}, nil
}

func (s *AuthService) LoginBeneficiary(ctx context.Context, phone, pin string) (*AuthResult, error) {
	var (
		u             domain.User
		dob           *time.Time
		phoneDB       *string
		email         *string
		regionScope   []string
		metadataBytes []byte
		pinHash       string
	)

	phone = strings.TrimSpace(phone)
	pin = strings.TrimSpace(pin)
	if phone == "" || pin == "" {
		return nil, ErrInvalidCredential
	}

	query := `SELECT id, role, nik, name, dob, phone, email, pin_hash,
        region_prov, region_kab, region_kec, region_kel,
        region_scope, metadata
        FROM users
        WHERE phone = $1 AND role = 'BENEFICIARY'
        LIMIT 1`

	row := s.db.QueryRow(ctx, query, phone)
	if err := row.Scan(&u.ID, &u.Role, &u.NIK, &u.Name, &dob, &phoneDB, &email, &pinHash,
		&u.Region.Prov, &u.Region.Kab, &u.Region.Kec, &u.Region.Kel,
		&regionScope, &metadataBytes); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInvalidCredential
		}
		return nil, err
	}

	if !verifyPIN(pinHash, pin) {
		return nil, ErrInvalidCredential
	}

	u.DOB = dob
	u.Phone = phoneDB
	u.Email = email
	u.RegionScope = regionScope
	if len(metadataBytes) > 0 {
		_ = json.Unmarshal(metadataBytes, &u.Metadata)
	}

	sess := s.sessions.Create(u.ID, u.Role, regionScope)
	return &AuthResult{Session: sess, User: u}, nil
}

func (s *AuthService) Validate(token string) (*Session, bool) {
	return s.sessions.Get(token)
}

type SessionStore struct {
	mu   sync.RWMutex
	data map[string]Session
}

func NewSessionStore() *SessionStore {
	return &SessionStore{data: make(map[string]Session)}
}

func (s *SessionStore) Create(userID, role string, regionScope []string) Session {
	s.mu.Lock()
	defer s.mu.Unlock()

	sess := Session{
		Token:       uuid.NewString(),
		UserID:      userID,
		Role:        role,
		RegionScope: append([]string{}, regionScope...),
		IssuedAt:    time.Now().UTC(),
	}
	s.data[sess.Token] = sess
	return sess
}

func (s *SessionStore) Get(token string) (*Session, bool) {
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
