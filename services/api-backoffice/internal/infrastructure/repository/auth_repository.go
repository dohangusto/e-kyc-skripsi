package repository

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	domain "e-kyc/services/api-backoffice/internal/domain"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type authRepository struct {
	db *pgxpool.Pool
}

func NewAuthRepository(db *pgxpool.Pool) domain.AuthRepository {
	return &authRepository{db: db}
}

func (repo *authRepository) FindAdminByNIK(ctx context.Context, nik string) (*domain.UserCredential, error) {
	query := `SELECT id, role, nik, name, dob, phone, email, pin_hash,
        region_prov, region_kab, region_kec, region_kel,
        region_scope, metadata
        FROM users
        WHERE nik = $1 AND role <> 'BENEFICIARY'
        LIMIT 1`

	row := repo.db.QueryRow(ctx, query, nik)
	return scanUserCredential(row)
}

func (repo *authRepository) FindBeneficiaryByPhone(ctx context.Context, phone string) (*domain.UserCredential, error) {
	query := `SELECT id, role, nik, name, dob, phone, email, pin_hash,
        region_prov, region_kab, region_kec, region_kel,
        region_scope, metadata
        FROM users
        WHERE phone = $1 AND role = 'BENEFICIARY'
        LIMIT 1`

	row := repo.db.QueryRow(ctx, query, phone)
	return scanUserCredential(row)
}

func scanUserCredential(row pgx.Row) (*domain.UserCredential, error) {
	var (
		u             domain.User
		dob           *time.Time
		phone         *string
		email         *string
		regionScope   []string
		metadataBytes []byte
		pinHash       string
	)

	if err := row.Scan(&u.ID, &u.Role, &u.NIK, &u.Name, &dob, &phone, &email, &pinHash,
		&u.Region.Prov, &u.Region.Kab, &u.Region.Kec, &u.Region.Kel,
		&regionScope, &metadataBytes); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}

	u.DOB = dob
	u.Phone = phone
	u.Email = email
	u.RegionScope = regionScope
	if len(metadataBytes) > 0 {
		_ = json.Unmarshal(metadataBytes, &u.Metadata)
	}

	return &domain.UserCredential{
		User:    u,
		PINHash: pinHash,
	}, nil
}
