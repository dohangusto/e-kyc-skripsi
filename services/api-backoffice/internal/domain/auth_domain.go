package domain

import (
	"context"
	"time"

	"github.com/labstack/echo/v4"
)

type UserCredential struct {
	User    User
	PINHash string
}

type Session struct {
	Token       string    `json:"token"`
	UserID      string    `json:"userId"`
	Role        string    `json:"role"`
	RegionScope []string  `json:"regionScope"`
	IssuedAt    time.Time `json:"issuedAt"`
	ExpiresAt   time.Time `json:"expiresAt"`
}

type AuthResult struct {
	Session Session `json:"session"`
	User    User    `json:"user"`
}

type AuthRepository interface {
	FindAdminByNIK(ctx context.Context, nik string) (*UserCredential, error)
	FindBeneficiaryByPhone(ctx context.Context, phone string) (*UserCredential, error)
	FindEligibleBeneficiary(ctx context.Context, name, nik string) (*UserCredential, error)
	UpdateLastLogin(ctx context.Context, userID string) error
}

type AuthService interface {
	LoginAdmin(ctx context.Context, nik, pin string) (*AuthResult, error)
	LoginBeneficiary(ctx context.Context, phone, pin string) (*AuthResult, error)
	CheckBeneficiaryEligibility(ctx context.Context, name, nik string) (*User, error)
	Validate(token string) (*Session, bool)
}

type AuthHTTPHandler interface {
	LoginAdmin(ctx echo.Context) error
	LoginBeneficiary(ctx echo.Context) error
	Me(ctx echo.Context) error
	CheckEligibility(ctx echo.Context) error
}
