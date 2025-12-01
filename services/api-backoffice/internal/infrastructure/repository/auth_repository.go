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
	phone = normalizePhone(phone)
	query := `SELECT id, role, nik, name, dob, phone, email, pin_hash,
        region_prov, region_kab, region_kec, region_kel,
        region_scope, metadata
        FROM users
        WHERE phone = $1 AND role = 'BENEFICIARY'
        LIMIT 1`

	row := repo.db.QueryRow(ctx, query, phone)
	return scanUserCredential(row)
}

func (repo *authRepository) FindEligibleBeneficiary(ctx context.Context, name, nik string) (*domain.UserCredential, error) {
	query := `SELECT id, role, nik, name, dob, phone, email, pin_hash,
        region_prov, region_kab, region_kec, region_kel,
        region_scope, metadata
        FROM users
        WHERE role = 'BENEFICIARY'
          AND nik = $1
          AND LOWER(name) = LOWER($2)
          AND (phone IS NULL OR phone = '')
          AND dob IS NULL
          AND (pin_hash IS NULL OR pin_hash = '')
        LIMIT 1`

	row := repo.db.QueryRow(ctx, query, nik, name)
	return scanUserCredential(row)
}

func (repo *authRepository) UpdateLastLogin(ctx context.Context, userID string) error {
	_, err := repo.db.Exec(ctx, `UPDATE users SET last_login = NOW() WHERE id = $1`, userID)
	return err
}

func scanUserCredential(row pgx.Row) (*domain.UserCredential, error) {
	var (
		u             domain.User
		dob           *time.Time
		phone         *string
		email         *string
		regionProv    *string
		regionKab     *string
		regionKec     *string
		regionKel     *string
		regionScope   []string
		metadataBytes []byte
		pinHash       *string
	)

	if err := row.Scan(&u.ID, &u.Role, &u.NIK, &u.Name, &dob, &phone, &email, &pinHash,
		&regionProv, &regionKab, &regionKec, &regionKel,
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
	u.Region.Prov = derefString(regionProv)
	u.Region.Kab = derefString(regionKab)
	u.Region.Kec = derefString(regionKec)
	u.Region.Kel = derefString(regionKel)
	if len(metadataBytes) > 0 {
		_ = json.Unmarshal(metadataBytes, &u.Metadata)
	}

	cred := &domain.UserCredential{
		User:    u,
		PINHash: "",
	}
	if pinHash != nil {
		cred.PINHash = *pinHash
	}

	return cred, nil
}

func derefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
