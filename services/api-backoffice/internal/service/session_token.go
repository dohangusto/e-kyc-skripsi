package service

import (
	"errors"
	"strings"
	"time"

	domain "e-kyc/services/api-backoffice/internal/domain"

	"github.com/golang-jwt/jwt/v5"
)

type JWTSessionManager struct {
	secret []byte
}

type sessionClaims struct {
	UserID      string   `json:"uid"`
	Role        string   `json:"role"`
	RegionScope []string `json:"scope"`
	jwt.RegisteredClaims
}

func NewJWTSessionManager(secret string) (*JWTSessionManager, error) {
	trimmed := strings.TrimSpace(secret)
	if trimmed == "" {
		return nil, errors.New("jwt secret is required")
	}
	return &JWTSessionManager{secret: []byte(trimmed)}, nil
}

func (m *JWTSessionManager) Create(userID, role string, regionScope []string, ttl time.Duration) (domain.Session, error) {
	if ttl <= 0 {
		ttl = 24 * time.Hour
	}
	now := time.Now().UTC()
	expiry := now.Add(ttl)
	claims := sessionClaims{
		UserID:      userID,
		Role:        role,
		RegionScope: append([]string{}, regionScope...),
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiry),
			Subject:   userID,
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(m.secret)
	if err != nil {
		return domain.Session{}, err
	}
	return domain.Session{
		Token:       signed,
		UserID:      userID,
		Role:        role,
		RegionScope: append([]string{}, regionScope...),
		IssuedAt:    now,
		ExpiresAt:   expiry,
	}, nil
}

func (m *JWTSessionManager) Parse(token string) (*domain.Session, error) {
	parsed, err := jwt.ParseWithClaims(token, &sessionClaims{}, func(t *jwt.Token) (interface{}, error) {
		return m.secret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := parsed.Claims.(*sessionClaims)
	if !ok || !parsed.Valid {
		return nil, errors.New("invalid token claims")
	}
	issuedAt := time.Now().UTC()
	if claims.IssuedAt != nil {
		issuedAt = claims.IssuedAt.Time
	}
	expiresAt := issuedAt
	if claims.ExpiresAt != nil {
		expiresAt = claims.ExpiresAt.Time
	}
	return &domain.Session{
		Token:       token,
		UserID:      claims.UserID,
		Role:        claims.Role,
		RegionScope: append([]string{}, claims.RegionScope...),
		IssuedAt:    issuedAt,
		ExpiresAt:   expiresAt,
	}, nil
}
