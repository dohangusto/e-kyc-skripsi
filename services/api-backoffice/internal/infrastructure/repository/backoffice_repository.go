package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	domain "e-kyc/services/api-backoffice/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type backofficeRepository struct {
	db *pgxpool.Pool
}

func NewBackofficeRepository(db *pgxpool.Pool) domain.BackofficeRepository {
	return &backofficeRepository{db: db}
}

func (repo *backofficeRepository) withTx(ctx context.Context, fn func(pgx.Tx) error) error {
	tx, err := repo.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if err := fn(tx); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (repo *backofficeRepository) insertTimeline(ctx context.Context, tx pgx.Tx, entry domain.TimelineEntry) error {
	metaBytes, _ := json.Marshal(entry.Metadata)
	_, err := tx.Exec(ctx, `
        INSERT INTO application_timeline (application_id, occurred_at, actor, action, reason, metadata)
        VALUES ($1,NOW(),$2,$3,$4,$5::jsonb)`,
		entry.ApplicationID, entry.Actor, entry.Action, entry.Reason, metaBytes)
	return err
}

func (repo *backofficeRepository) insertAudit(ctx context.Context, tx pgx.Tx, entry domain.AuditEntry) error {
	metaBytes, _ := json.Marshal(entry.Metadata)
	_, err := tx.Exec(ctx, `
        INSERT INTO audit_logs (occurred_at, actor, entity, action, reason, metadata)
        VALUES (NOW(),$1,$2,$3,$4,$5::jsonb)`,
		entry.Actor, entry.Entity, entry.Action, entry.Reason, metaBytes)
	return err
}

func decodeJSON(data []byte) map[string]any {
	if len(data) == 0 {
		return map[string]any{}
	}
	var out map[string]any
	if err := json.Unmarshal(data, &out); err != nil {
		return map[string]any{}
	}
	return out
}

func decodeStringArray(data []byte) []string {
	if len(data) == 0 {
		return nil
	}
	var out []string
	if err := json.Unmarshal(data, &out); err != nil {
		return nil
	}
	return out
}

func decodeRegion(data []byte) domain.Region {
	if len(data) == 0 {
		return domain.Region{}
	}
	var region domain.Region
	if err := json.Unmarshal(data, &region); err != nil {
		return domain.Region{}
	}
	return region
}

func maskNikValue(nik string) string {
	if len(nik) <= 4 {
		return nik
	}
	maskLen := len(nik) - 4
	return strings.Repeat("*", maskLen) + nik[maskLen:]
}

func (repo *backofficeRepository) ListApplications(ctx context.Context, limit int) ([]domain.Application, error) {
	rows, err := repo.db.Query(ctx, `
        SELECT a.id, u.name, a.applicant_nik_mask, a.applicant_dob,
               COALESCE(a.applicant_phone_mask, ''),
               u.region_prov, u.region_kab, u.region_kec, u.region_kel,
               a.status, a.assigned_to, a.aging_days,
               a.score_ocr, a.score_face, a.score_liveness,
               a.flags, a.created_at, a.updated_at
        FROM applications a
        JOIN users u ON u.id = a.beneficiary_user_id
        ORDER BY a.created_at DESC
        LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	apps := make([]domain.Application, 0)
	for rows.Next() {
		var (
			app        domain.Application
			phone      string
			assignedTo *string
		)

		if err := rows.Scan(
			&app.ID, &app.ApplicantName, &app.ApplicantNikMask, &app.ApplicantDOB,
			&phone,
			&app.Region.Prov, &app.Region.Kab, &app.Region.Kec, &app.Region.Kel,
			&app.Status, &assignedTo, &app.AgingDays,
			&app.ScoreOCR, &app.ScoreFace, &app.ScoreLiveness,
			&app.Flags, &app.CreatedAt, &app.UpdatedAt,
		); err != nil {
			return nil, err
		}
		app.ApplicantPhone = phone
		app.AssignedTo = assignedTo
		apps = append(apps, app)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(apps) == 0 {
		return apps, nil
	}
	ids := make([]string, len(apps))
	for i, app := range apps {
		ids[i] = app.ID
	}
	visitMap, err := repo.fetchVisitsByApplications(ctx, ids)
	if err != nil {
		return nil, err
	}
	for i := range apps {
		if visits, ok := visitMap[apps[i].ID]; ok {
			apps[i].Visits = visits
		}
	}
	return apps, nil
}

func (repo *backofficeRepository) GetApplication(ctx context.Context, id string) (*domain.Application, error) {
	var (
		app        domain.Application
		phone      string
		assignedTo *string
	)

	row := repo.db.QueryRow(ctx, `
        SELECT a.id, u.name, a.applicant_nik_mask, a.applicant_dob,
               COALESCE(a.applicant_phone_mask, ''),
               u.region_prov, u.region_kab, u.region_kec, u.region_kel,
               a.status, a.assigned_to, a.aging_days,
               a.score_ocr, a.score_face, a.score_liveness,
               a.flags, a.created_at, a.updated_at
        FROM applications a
        JOIN users u ON u.id = a.beneficiary_user_id
        WHERE a.id = $1`, id)

	if err := row.Scan(
		&app.ID, &app.ApplicantName, &app.ApplicantNikMask, &app.ApplicantDOB,
		&phone,
		&app.Region.Prov, &app.Region.Kab, &app.Region.Kec, &app.Region.Kel,
		&app.Status, &assignedTo, &app.AgingDays,
		&app.ScoreOCR, &app.ScoreFace, &app.ScoreLiveness,
		&app.Flags, &app.CreatedAt, &app.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	app.ApplicantPhone = phone
	app.AssignedTo = assignedTo

	docs, err := repo.fetchDocuments(ctx, id)
	if err != nil {
		return nil, err
	}
	app.Documents = docs

	visits, err := repo.fetchVisits(ctx, id)
	if err != nil {
		return nil, err
	}
	app.Visits = visits

	timeline, err := repo.fetchTimeline(ctx, id)
	if err != nil {
		return nil, err
	}
	app.Timeline = timeline

	survey, err := repo.fetchSurvey(ctx, id)
	if err != nil {
		return nil, err
	}
	if survey != nil {
		app.Survey = survey
	}

	return &app, nil
}

func (repo *backofficeRepository) ListUsers(ctx context.Context) ([]domain.User, error) {
	rows, err := repo.db.Query(ctx, `
        SELECT id, role, nik, name, dob, phone, email,
               region_prov, region_kab, region_kec, region_kel,
               region_scope, metadata, created_at, updated_at
        FROM users
        ORDER BY name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []domain.User
	for rows.Next() {
		var (
			user         domain.User
			dob          *time.Time
			phone        *string
			email        *string
			regionScope  []string
			metadataJSON []byte
		)
		if err := rows.Scan(&user.ID, &user.Role, &user.NIK, &user.Name, &dob, &phone, &email,
			&user.Region.Prov, &user.Region.Kab, &user.Region.Kec, &user.Region.Kel,
			&regionScope, &metadataJSON, &user.CreatedAt, &user.UpdatedAt); err != nil {
			return nil, err
		}
		user.DOB = dob
		user.Phone = phone
		user.Email = email
		user.RegionScope = regionScope
		if len(metadataJSON) > 0 {
			if err := json.Unmarshal(metadataJSON, &user.Metadata); err != nil {
				user.Metadata = map[string]any{}
			}
		}
		users = append(users, user)
	}
	return users, rows.Err()
}

func (repo *backofficeRepository) ListBeneficiaries(ctx context.Context, limit int) ([]domain.Beneficiary, error) {
	if limit <= 0 {
		limit = 200
	}
	rows, err := repo.db.Query(ctx, `
        SELECT u.id, u.role, u.nik, u.name, u.dob, u.phone, u.email,
               u.region_prov, u.region_kab, u.region_kec, u.region_kel,
               u.region_scope, u.metadata, u.created_at, u.updated_at,
               b.household_size, b.cluster_category, b.cluster_priority, b.portal_flags
        FROM beneficiaries b
        JOIN users u ON u.id = b.user_id
        ORDER BY u.created_at DESC
        LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var beneficiaries []domain.Beneficiary
	for rows.Next() {
		var (
			bene         domain.Beneficiary
			dob          *time.Time
			phone        *string
			email        *string
			regionScope  []string
			metadataJSON []byte
			portalJSON   []byte
		)
		if err := rows.Scan(&bene.User.ID, &bene.User.Role, &bene.User.NIK, &bene.User.Name, &dob, &phone, &email,
			&bene.User.Region.Prov, &bene.User.Region.Kab, &bene.User.Region.Kec, &bene.User.Region.Kel,
			&regionScope, &metadataJSON, &bene.User.CreatedAt, &bene.User.UpdatedAt,
			&bene.HouseholdSize, &bene.ClusterCategory, &bene.ClusterPriority, &portalJSON); err != nil {
			return nil, err
		}
		bene.User.DOB = dob
		bene.User.Phone = phone
		bene.User.Email = email
		bene.User.RegionScope = regionScope
		if len(metadataJSON) > 0 {
			if err := json.Unmarshal(metadataJSON, &bene.User.Metadata); err != nil {
				bene.User.Metadata = map[string]any{}
			}
		}
		if bene.User.Metadata == nil {
			bene.User.Metadata = map[string]any{}
		}
		if len(portalJSON) > 0 {
			if err := json.Unmarshal(portalJSON, &bene.PortalFlags); err != nil {
				bene.PortalFlags = map[string]any{}
			}
		}
		if bene.PortalFlags == nil {
			bene.PortalFlags = map[string]any{}
		}
		beneficiaries = append(beneficiaries, bene)
	}
	return beneficiaries, rows.Err()
}

func (repo *backofficeRepository) GetConfig(ctx context.Context) (*domain.SystemConfig, error) {
	row := repo.db.QueryRow(ctx, `
        SELECT period, thresholds, features, updated_at
        FROM system_config
        WHERE id = 1`)

	var cfg domain.SystemConfig
	var thresholds, features []byte

	if err := row.Scan(&cfg.Period, &thresholds, &features, &cfg.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	cfg.Thresholds = decodeJSON(thresholds)
	cfg.Features = decodeJSON(features)
	return &cfg, nil
}

func (repo *backofficeRepository) UpsertConfig(ctx context.Context, cfg domain.SystemConfig) (*domain.SystemConfig, error) {
	thresholdsBytes, _ := json.Marshal(cfg.Thresholds)
	featuresBytes, _ := json.Marshal(cfg.Features)

	if _, err := repo.db.Exec(ctx, `
        INSERT INTO system_config (id, period, thresholds, features)
        VALUES (1, $1, $2::jsonb, $3::jsonb)
        ON CONFLICT (id) DO UPDATE
        SET period = EXCLUDED.period,
            thresholds = EXCLUDED.thresholds,
            features = EXCLUDED.features,
            updated_at = NOW()`,
		cfg.Period, thresholdsBytes, featuresBytes,
	); err != nil {
		return nil, err
	}
	return repo.GetConfig(ctx)
}

func (repo *backofficeRepository) UpdateApplicationStatus(ctx context.Context, params domain.UpdateApplicationStatusParams) error {
	return repo.withTx(ctx, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `UPDATE applications SET status=$1, updated_at=NOW() WHERE id=$2`, params.Status, params.AppID)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return domain.ErrNotFound
		}
		if err := repo.insertTimeline(ctx, tx, params.Timeline); err != nil {
			return err
		}
		return repo.insertAudit(ctx, tx, params.Audit)
	})
}

func (repo *backofficeRepository) CreateVisit(ctx context.Context, visit *domain.Visit, timeline domain.TimelineEntry) error {
	return repo.withTx(ctx, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `
            INSERT INTO application_visits (id, application_id, scheduled_at, status, tksk_id)
            VALUES ($1,$2,$3,$4,$5)`,
			visit.ID, visit.ApplicationID, visit.ScheduledAt, visit.Status, visit.TkskID); err != nil {
			return err
		}
		return repo.insertTimeline(ctx, tx, timeline)
	})
}

func (repo *backofficeRepository) UpdateVisit(ctx context.Context, params domain.UpdateVisitParams) error {
	return repo.withTx(ctx, func(tx pgx.Tx) error {
		var setParts []string
		var args []any
		argIdx := 1

		if params.GeotagLat != nil && params.GeotagLng != nil {
			setParts = append(setParts, fmt.Sprintf("geotag_lat=$%d, geotag_lng=$%d", argIdx, argIdx+1))
			args = append(args, params.GeotagLat, params.GeotagLng)
			argIdx += 2
		}
		if params.Photos != nil {
			bytes, _ := json.Marshal(params.Photos)
			setParts = append(setParts, fmt.Sprintf("photos=$%d::jsonb", argIdx))
			args = append(args, bytes)
			argIdx++
		}
		if params.Checklist != nil {
			bytes, _ := json.Marshal(params.Checklist)
			setParts = append(setParts, fmt.Sprintf("checklist=$%d::jsonb", argIdx))
			args = append(args, bytes)
			argIdx++
		}
		if params.Status != nil && *params.Status != "" {
			setParts = append(setParts, fmt.Sprintf("status=$%d", argIdx))
			args = append(args, *params.Status)
			argIdx++
		}
		if len(setParts) == 0 {
			return nil
		}
		args = append(args, params.VisitID, params.AppID)
		query := fmt.Sprintf(`UPDATE application_visits SET %s WHERE id=$%d AND application_id=$%d`, strings.Join(setParts, ", "), argIdx, argIdx+1)

		tag, err := tx.Exec(ctx, query, args...)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return domain.ErrNotFound
		}
		return repo.insertTimeline(ctx, tx, params.Timeline)
	})
}

func (repo *backofficeRepository) ListBatches(ctx context.Context) ([]domain.Batch, error) {
	rows, err := repo.db.Query(ctx, `
        SELECT id, code, status, checksum, created_at, updated_at
        FROM batches
        ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var batches []domain.Batch
	for rows.Next() {
		var batch domain.Batch
		if err := rows.Scan(&batch.ID, &batch.Code, &batch.Status, &batch.Checksum, &batch.CreatedAt, &batch.UpdatedAt); err != nil {
			return nil, err
		}
		items, err := repo.fetchBatchItems(ctx, batch.ID)
		if err != nil {
			return nil, err
		}
		batch.Items = items
		batches = append(batches, batch)
	}
	return batches, rows.Err()
}

func (repo *backofficeRepository) fetchBatchItems(ctx context.Context, batchID string) ([]string, error) {
	rows, err := repo.db.Query(ctx, `SELECT application_id FROM batch_items WHERE batch_id=$1`, batchID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []string
	for rows.Next() {
		var appID string
		if err := rows.Scan(&appID); err != nil {
			return nil, err
		}
		items = append(items, appID)
	}
	return items, rows.Err()
}

func (repo *backofficeRepository) CreateBatch(ctx context.Context, batch *domain.Batch, audit domain.AuditEntry) error {
	return repo.withTx(ctx, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `
            INSERT INTO batches (id, code, status, checksum)
            VALUES ($1,$2,$3,$4)`,
			batch.ID, batch.Code, batch.Status, batch.Checksum); err != nil {
			return err
		}
		for _, appID := range batch.Items {
			if _, err := tx.Exec(ctx, `INSERT INTO batch_items (batch_id, application_id) VALUES ($1,$2)`, batch.ID, appID); err != nil {
				return err
			}
		}
		return repo.insertAudit(ctx, tx, audit)
	})
}

func (repo *backofficeRepository) UpdateBatchStatus(ctx context.Context, params domain.UpdateBatchStatusParams) error {
	return repo.withTx(ctx, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `UPDATE batches SET status=$1, updated_at=NOW() WHERE id=$2`, params.Status, params.BatchID)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return domain.ErrNotFound
		}
		return repo.insertAudit(ctx, tx, params.Audit)
	})
}

func (repo *backofficeRepository) ListDistributions(ctx context.Context) ([]domain.Distribution, error) {
	rows, err := repo.db.Query(ctx, `
        SELECT id, name, scheduled_at, channel, location, status, notes, created_by, created_at, updated_by, updated_at
        FROM distributions
        ORDER BY scheduled_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.Distribution
	for rows.Next() {
		var dist domain.Distribution
		if err := rows.Scan(&dist.ID, &dist.Name, &dist.ScheduledAt, &dist.Channel, &dist.Location, &dist.Status,
			&dist.Notes, &dist.CreatedBy, &dist.CreatedAt, &dist.UpdatedBy, &dist.UpdatedAt); err != nil {
			return nil, err
		}
		dist.BatchCodes, err = repo.fetchDistributionCodes(ctx, dist.ID)
		if err != nil {
			return nil, err
		}
		dist.Beneficiaries, dist.Notified, err = repo.fetchDistributionBeneficiaries(ctx, dist.ID)
		if err != nil {
			return nil, err
		}
		result = append(result, dist)
	}
	return result, rows.Err()
}

func (repo *backofficeRepository) fetchDistributionCodes(ctx context.Context, distID string) ([]string, error) {
	rows, err := repo.db.Query(ctx, `SELECT batch_code FROM distribution_batches WHERE distribution_id=$1`, distID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var code string
		if err := rows.Scan(&code); err != nil {
			return nil, err
		}
		out = append(out, code)
	}
	return out, rows.Err()
}

func (repo *backofficeRepository) fetchDistributionBeneficiaries(ctx context.Context, distID string) ([]string, []string, error) {
	rows, err := repo.db.Query(ctx, `SELECT user_id FROM distribution_beneficiaries WHERE distribution_id=$1`, distID)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()
	var beneficiaries []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, nil, err
		}
		beneficiaries = append(beneficiaries, id)
	}
	rows2, err := repo.db.Query(ctx, `SELECT user_id FROM distribution_notified WHERE distribution_id=$1`, distID)
	if err != nil {
		return nil, nil, err
	}
	defer rows2.Close()
	var notified []string
	for rows2.Next() {
		var id string
		if err := rows2.Scan(&id); err != nil {
			return nil, nil, err
		}
		notified = append(notified, id)
	}
	if err := rows2.Err(); err != nil {
		return nil, nil, err
	}
	return beneficiaries, notified, rows.Err()
}

func (repo *backofficeRepository) CreateDistribution(ctx context.Context, dist *domain.Distribution, audit domain.AuditEntry) error {
	return repo.withTx(ctx, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `
            INSERT INTO distributions (id, name, scheduled_at, channel, location, status, notes, created_by, created_at, updated_by, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
			dist.ID, dist.Name, dist.ScheduledAt, dist.Channel, dist.Location, dist.Status, dist.Notes,
			dist.CreatedBy, dist.CreatedAt, dist.UpdatedBy, dist.UpdatedAt); err != nil {
			return err
		}
		for _, code := range dist.BatchCodes {
			if _, err := tx.Exec(ctx, `INSERT INTO distribution_batches (distribution_id, batch_code) VALUES ($1,$2)`, dist.ID, code); err != nil {
				return err
			}
		}
		for _, userID := range dist.Beneficiaries {
			if _, err := tx.Exec(ctx, `INSERT INTO distribution_beneficiaries (distribution_id, user_id) VALUES ($1,$2)`, dist.ID, userID); err != nil {
				return err
			}
		}
		return repo.insertAudit(ctx, tx, audit)
	})
}

func (repo *backofficeRepository) UpdateDistributionStatus(ctx context.Context, params domain.UpdateDistributionStatusParams) error {
	return repo.withTx(ctx, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `UPDATE distributions SET status=$1, updated_by=$2, updated_at=NOW() WHERE id=$3`, params.Status, params.Audit.Actor, params.DistributionID)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return domain.ErrNotFound
		}
		return repo.insertAudit(ctx, tx, params.Audit)
	})
}

func (repo *backofficeRepository) NotifyDistribution(ctx context.Context, params domain.NotifyDistributionParams) error {
	if len(params.UserIDs) == 0 {
		return nil
	}
	return repo.withTx(ctx, func(tx pgx.Tx) error {
		for _, userID := range params.UserIDs {
			if _, err := tx.Exec(ctx, `
                INSERT INTO distribution_notified (distribution_id, user_id, notified_at)
                VALUES ($1,$2,NOW())
                ON CONFLICT DO NOTHING`, params.DistributionID, userID); err != nil {
				return err
			}
		}
		if _, err := tx.Exec(ctx, `UPDATE distributions SET updated_at=NOW(), updated_by=$2 WHERE id=$1`, params.DistributionID, params.Actor); err != nil {
			return err
		}
		return repo.insertAudit(ctx, tx, params.Audit)
	})
}

func (repo *backofficeRepository) ListClusteringRuns(ctx context.Context) ([]domain.ClusteringRun, error) {
	rows, err := repo.db.Query(ctx, `
        SELECT id, operator, started_at, finished_at, parameters, summary
        FROM clustering_runs
        ORDER BY started_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var runs []domain.ClusteringRun
	for rows.Next() {
		var (
			run            domain.ClusteringRun
			parametersJSON []byte
			summaryJSON    []byte
		)
		if err := rows.Scan(&run.ID, &run.Operator, &run.StartedAt, &run.FinishedAt, &parametersJSON, &summaryJSON); err != nil {
			return nil, err
		}
		run.Parameters = decodeJSON(parametersJSON)
		run.Summary = decodeJSON(summaryJSON)
		candidates, err := repo.fetchClusteringCandidates(ctx, run.ID)
		if err != nil {
			return nil, err
		}
		run.Candidates = candidates
		runs = append(runs, run)
	}
	return runs, rows.Err()
}

func (repo *backofficeRepository) GetClusteringRun(ctx context.Context, runID string) (*domain.ClusteringRun, error) {
	row := repo.db.QueryRow(ctx, `
        SELECT id, operator, started_at, finished_at, parameters, summary
        FROM clustering_runs
        WHERE id = $1`, runID)

	var (
		run            domain.ClusteringRun
		parametersJSON []byte
		summaryJSON    []byte
	)
	if err := row.Scan(&run.ID, &run.Operator, &run.StartedAt, &run.FinishedAt, &parametersJSON, &summaryJSON); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	run.Parameters = decodeJSON(parametersJSON)
	run.Summary = decodeJSON(summaryJSON)
	candidates, err := repo.fetchClusteringCandidates(ctx, run.ID)
	if err != nil {
		return nil, err
	}
	run.Candidates = candidates
	return &run, nil
}

func (repo *backofficeRepository) fetchClusteringCandidates(ctx context.Context, runID string) ([]domain.ClusteringCandidate, error) {
	rows, err := repo.db.Query(ctx, `
        SELECT c.id, c.user_id, c.run_id, u.name, COALESCE(u.nik, ''), c.region, c.cluster, c.priority, c.score, c.household_size, c.status,
               c.assigned_to, c.reviewer, c.reviewed_at, c.notes
        FROM clustering_candidates c
        JOIN users u ON u.id = c.user_id
        WHERE c.run_id = $1`, runID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var candidates []domain.ClusteringCandidate
	for rows.Next() {
		var (
			candidate   domain.ClusteringCandidate
			regionBytes []byte
		)
		var nik string
		if err := rows.Scan(&candidate.ID, &candidate.UserID, &candidate.RunID, &candidate.Name, &nik, &regionBytes, &candidate.Cluster, &candidate.Priority,
			&candidate.Score, &candidate.HouseholdSize, &candidate.Status, &candidate.AssignedTo, &candidate.Reviewer, &candidate.ReviewedAt, &candidate.Notes); err != nil {
			return nil, err
		}
		candidate.NikMask = maskNikValue(nik)
		candidate.Region = decodeRegion(regionBytes)
		candidates = append(candidates, candidate)
	}
	return candidates, rows.Err()
}

func (repo *backofficeRepository) CreateClusteringRun(ctx context.Context, run *domain.ClusteringRun, audit domain.AuditEntry, candidates []domain.ClusteringCandidate) error {
	return repo.withTx(ctx, func(tx pgx.Tx) error {
		paramsJSON, _ := json.Marshal(run.Parameters)
		summaryJSON, _ := json.Marshal(run.Summary)
		if _, err := tx.Exec(ctx, `
            INSERT INTO clustering_runs (id, operator, started_at, finished_at, parameters, summary)
            VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb)`,
			run.ID, run.Operator, run.StartedAt, run.FinishedAt, paramsJSON, summaryJSON); err != nil {
			return err
		}
		for _, candidate := range candidates {
			regionJSON, _ := json.Marshal(candidate.Region)
			if _, err := tx.Exec(ctx, `
                INSERT INTO clustering_candidates (
                    id, run_id, user_id, region, cluster, priority, score, household_size,
                    status, assigned_to, reviewer, reviewed_at, notes)
                VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
				candidate.ID, candidate.RunID, candidate.UserID, regionJSON, candidate.Cluster, candidate.Priority,
				candidate.Score, candidate.HouseholdSize, candidate.Status, candidate.AssignedTo, candidate.Reviewer,
				candidate.ReviewedAt, candidate.Notes); err != nil {
				return err
			}
		}
		if audit.Actor != "" {
			if err := repo.insertAudit(ctx, tx, audit); err != nil {
				return err
			}
		}
		return nil
	})
}

func (repo *backofficeRepository) AssignClusteringCandidate(ctx context.Context, params domain.AssignClusteringCandidateParams) error {
	return repo.withTx(ctx, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `
            UPDATE clustering_candidates
            SET assigned_to=$1, status=CASE WHEN status='PENDING_REVIEW' THEN 'IN_REVIEW' ELSE status END
            WHERE id=$2 AND run_id=$3`, params.TkskID, params.CandidateID, params.RunID)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return domain.ErrNotFound
		}
		return repo.insertAudit(ctx, tx, params.Audit)
	})
}

func (repo *backofficeRepository) UpdateClusteringCandidateStatus(ctx context.Context, params domain.UpdateClusteringCandidateStatusParams) error {
	return repo.withTx(ctx, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `
            UPDATE clustering_candidates
            SET status=$1, reviewer=$2, reviewed_at=NOW(), notes=$3
            WHERE id=$4 AND run_id=$5`, params.Status, params.Actor, params.Notes, params.CandidateID, params.RunID)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return domain.ErrNotFound
		}
		return repo.insertAudit(ctx, tx, params.Audit)
	})
}

func (repo *backofficeRepository) ListAuditLogs(ctx context.Context, limit int) ([]domain.AuditLog, error) {
	rows, err := repo.db.Query(ctx, `
        SELECT id, occurred_at, actor, entity, action, reason, metadata
        FROM audit_logs
        ORDER BY occurred_at DESC
        LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []domain.AuditLog
	for rows.Next() {
		var (
			logEntry domain.AuditLog
			meta     []byte
		)
		if err := rows.Scan(&logEntry.ID, &logEntry.OccurredAt, &logEntry.Actor, &logEntry.Entity, &logEntry.Action, &logEntry.Reason, &meta); err != nil {
			return nil, err
		}
		logEntry.Metadata = decodeJSON(meta)
		logs = append(logs, logEntry)
	}
	return logs, rows.Err()
}

func (repo *backofficeRepository) Overview(ctx context.Context) (map[string]any, error) {
	var (
		totalApplications  int
		pendingVisits      int
		totalBeneficiaries int
	)

	if err := repo.db.QueryRow(ctx, `SELECT COUNT(*) FROM applications`).Scan(&totalApplications); err != nil {
		return nil, err
	}
	if err := repo.db.QueryRow(ctx, `SELECT COUNT(*) FROM application_visits WHERE status <> 'SUBMITTED'`).Scan(&pendingVisits); err != nil {
		return nil, err
	}
	if err := repo.db.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE role = 'BENEFICIARY'`).Scan(&totalBeneficiaries); err != nil {
		return nil, err
	}

	return map[string]any{
		"applications":  totalApplications,
		"pendingVisits": pendingVisits,
		"beneficiaries": totalBeneficiaries,
	}, nil
}

func (repo *backofficeRepository) NormalizeUserIDs(ctx context.Context, ids []string) ([]string, error) {
	if len(ids) == 0 {
		return ids, nil
	}
	var normalized []string
	for _, id := range ids {
		if strings.HasPrefix(id, "APP-") {
			var userID string
			if err := repo.db.QueryRow(ctx, `SELECT beneficiary_user_id FROM applications WHERE id=$1`, id).Scan(&userID); err != nil {
				if errors.Is(err, pgx.ErrNoRows) {
					continue
				}
				return nil, err
			}
			normalized = append(normalized, userID)
		} else {
			normalized = append(normalized, id)
		}
	}
	return normalized, nil
}

func (repo *backofficeRepository) fetchDocuments(ctx context.Context, appID string) ([]domain.Document, error) {
	rows, err := repo.db.Query(ctx, `
        SELECT id, application_id, doc_type, url, sha256, created_at
        FROM application_documents
        WHERE application_id = $1`, appID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []domain.Document
	for rows.Next() {
		var doc domain.Document
		if err := rows.Scan(&doc.ID, &doc.ApplicationID, &doc.Type, &doc.URL, &doc.SHA256, &doc.CreatedAt); err != nil {
			return nil, err
		}
		docs = append(docs, doc)
	}
	return docs, rows.Err()
}

func (repo *backofficeRepository) fetchVisits(ctx context.Context, appID string) ([]domain.Visit, error) {
	rows, err := repo.db.Query(ctx, `
        SELECT id, application_id, scheduled_at, geotag_lat, geotag_lng, photos, checklist, status, COALESCE(tksk_id::text, ''), created_at
        FROM application_visits
        WHERE application_id = $1
        ORDER BY scheduled_at DESC`, appID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var visits []domain.Visit
	for rows.Next() {
		var (
			visit     domain.Visit
			photos    []byte
			checklist []byte
			geotagLat *float64
			geotagLng *float64
		)

		if err := rows.Scan(&visit.ID, &visit.ApplicationID, &visit.ScheduledAt, &geotagLat, &geotagLng, &photos, &checklist, &visit.Status, &visit.TkskID, &visit.CreatedAt); err != nil {
			return nil, err
		}
		visit.GeotagLat = geotagLat
		visit.GeotagLng = geotagLng
		visit.Photos = decodeStringArray(photos)
		visit.Checklist = decodeJSON(checklist)
		visits = append(visits, visit)
	}
	return visits, rows.Err()
}

func (repo *backofficeRepository) fetchVisitsByApplications(ctx context.Context, appIDs []string) (map[string][]domain.Visit, error) {
	if len(appIDs) == 0 {
		return map[string][]domain.Visit{}, nil
	}
	rows, err := repo.db.Query(ctx, `
        SELECT application_id, id, scheduled_at, geotag_lat, geotag_lng, photos, checklist, status, COALESCE(tksk_id::text, ''), created_at
        FROM application_visits
        WHERE application_id = ANY($1::text[])
        ORDER BY scheduled_at DESC`, appIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string][]domain.Visit, len(appIDs))
	for rows.Next() {
		var (
			applicationID string
			visit         domain.Visit
			photos        []byte
			checklist     []byte
			geotagLat     *float64
			geotagLng     *float64
		)
		if err := rows.Scan(&applicationID, &visit.ID, &visit.ScheduledAt, &geotagLat, &geotagLng, &photos, &checklist, &visit.Status, &visit.TkskID, &visit.CreatedAt); err != nil {
			return nil, err
		}
		visit.ApplicationID = applicationID
		visit.GeotagLat = geotagLat
		visit.GeotagLng = geotagLng
		visit.Photos = decodeStringArray(photos)
		visit.Checklist = decodeJSON(checklist)
		result[applicationID] = append(result[applicationID], visit)
	}
	return result, rows.Err()
}

func (repo *backofficeRepository) ListVisits(ctx context.Context, params domain.ListVisitsParams) ([]domain.Visit, error) {
	var (
		builder strings.Builder
		args    []any
		idx     = 1
	)
	builder.WriteString(`
        SELECT id, application_id, scheduled_at, geotag_lat, geotag_lng, photos, checklist, status, COALESCE(tksk_id::text, ''), created_at
        FROM application_visits
        WHERE 1=1`)
	if params.ApplicationID != "" {
		builder.WriteString(fmt.Sprintf(" AND application_id = $%d", idx))
		args = append(args, params.ApplicationID)
		idx++
	}
	if params.TkskID != "" {
		builder.WriteString(fmt.Sprintf(" AND tksk_id = $%d", idx))
		args = append(args, params.TkskID)
		idx++
	}
	if params.Status != "" {
		builder.WriteString(fmt.Sprintf(" AND status = $%d", idx))
		args = append(args, params.Status)
		idx++
	}
	if params.From != nil {
		builder.WriteString(fmt.Sprintf(" AND scheduled_at >= $%d", idx))
		args = append(args, params.From)
		idx++
	}
	if params.To != nil {
		builder.WriteString(fmt.Sprintf(" AND scheduled_at <= $%d", idx))
		args = append(args, params.To)
		idx++
	}
	limit := params.Limit
	if limit <= 0 || limit > 500 {
		limit = 200
	}
	builder.WriteString(fmt.Sprintf(" ORDER BY scheduled_at DESC LIMIT $%d", idx))
	args = append(args, limit)
	rows, err := repo.db.Query(ctx, builder.String(), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var visits []domain.Visit
	for rows.Next() {
		var (
			visit     domain.Visit
			photos    []byte
			checklist []byte
			geotagLat *float64
			geotagLng *float64
		)
		if err := rows.Scan(&visit.ID, &visit.ApplicationID, &visit.ScheduledAt, &geotagLat, &geotagLng, &photos, &checklist, &visit.Status, &visit.TkskID, &visit.CreatedAt); err != nil {
			return nil, err
		}
		visit.GeotagLat = geotagLat
		visit.GeotagLng = geotagLng
		visit.Photos = decodeStringArray(photos)
		visit.Checklist = decodeJSON(checklist)
		visits = append(visits, visit)
	}
	return visits, rows.Err()
}

func (repo *backofficeRepository) fetchTimeline(ctx context.Context, appID string) ([]domain.TimelineItem, error) {
	rows, err := repo.db.Query(ctx, `
        SELECT id, application_id, occurred_at, actor, action, reason, metadata
        FROM application_timeline
        WHERE application_id = $1
        ORDER BY occurred_at DESC`, appID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.TimelineItem
	for rows.Next() {
		var (
			item     domain.TimelineItem
			metadata []byte
		)
		if err := rows.Scan(&item.ID, &item.ApplicationID, &item.OccurredAt, &item.Actor, &item.Action, &item.Reason, &metadata); err != nil {
			return nil, err
		}
		item.Metadata = decodeJSON(metadata)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (repo *backofficeRepository) fetchSurvey(ctx context.Context, appID string) (*domain.SurveyState, error) {
	var (
		state   domain.SurveyState
		answers []byte
	)

	row := repo.db.QueryRow(ctx, `
        SELECT application_id, completed, submitted_at, status, answers
        FROM survey_responses
        WHERE application_id = $1`, appID)
	if err := row.Scan(&state.ApplicationID, &state.Completed, &state.SubmittedAt, &state.Status, &answers); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	state.Answers = decodeJSON(answers)
	return &state, nil
}

func (repo *backofficeRepository) CreateEkycSession(ctx context.Context, params domain.CreateEkycSessionParams) (*domain.EkycSession, error) {
	row := repo.db.QueryRow(ctx, `
        INSERT INTO ekyc_sessions (user_id)
        VALUES ($1)
        RETURNING id, user_id, status, face_matching_status, liveness_status, final_decision,
                  id_card_url, selfie_with_id_url, recorded_video_url,
                  face_match_overall, liveness_overall, rejection_reason,
                  metadata, created_at, updated_at`,
		params.UserID,
	)
	return scanEkycSessionRow(row)
}

func (repo *backofficeRepository) UpdateEkycSession(ctx context.Context, params domain.UpdateEkycArtifactsParams) (*domain.EkycSession, error) {
	row := repo.db.QueryRow(ctx, `
        UPDATE ekyc_sessions
        SET id_card_url = COALESCE($2, id_card_url),
            selfie_with_id_url = COALESCE($3, selfie_with_id_url),
            recorded_video_url = COALESCE($4, recorded_video_url),
            face_matching_status = COALESCE($5, face_matching_status),
            liveness_status = COALESCE($6, liveness_status),
            status = COALESCE($7, status),
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, user_id, status, face_matching_status, liveness_status, final_decision,
                  id_card_url, selfie_with_id_url, recorded_video_url,
                  face_match_overall, liveness_overall, rejection_reason,
                  metadata, created_at, updated_at`,
		params.SessionID, params.IDCardURL, params.SelfieWithIDURL, params.RecordedVideoURL,
		params.FaceMatchingStatus, params.LivenessStatus, params.Status,
	)
	return scanEkycSessionRow(row)
}

func (repo *backofficeRepository) SaveFaceChecks(ctx context.Context, params domain.SaveFaceChecksParams) (*domain.EkycSession, error) {
	var session *domain.EkycSession
	err := repo.withTx(ctx, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `DELETE FROM face_checks WHERE ekyc_session_id=$1`, params.SessionID); err != nil {
			return err
		}
		for _, check := range params.Checks {
			meta := []byte(`{}`)
			if check.Metadata != nil {
				meta, _ = json.Marshal(check.Metadata)
			}
			if _, err := tx.Exec(ctx, `
                INSERT INTO face_checks (ekyc_session_id, step, similarity_score, threshold, result, raw_metadata)
                VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
				params.SessionID, check.Step, check.Similarity, check.Threshold, check.Result, meta,
			); err != nil {
				return err
			}
		}
		row := tx.QueryRow(ctx, `
            UPDATE ekyc_sessions
            SET face_match_overall = $2,
                face_matching_status = $3,
                updated_at = NOW()
            WHERE id = $1
            RETURNING id, user_id, status, face_matching_status, liveness_status, final_decision,
                      id_card_url, selfie_with_id_url, recorded_video_url,
                      face_match_overall, liveness_overall, rejection_reason,
                      metadata, created_at, updated_at`,
			params.SessionID, params.Overall, params.Status,
		)
		result, err := scanEkycSessionRow(row)
		if err != nil {
			return err
		}
		session = result
		return nil
	})
	if err != nil {
		return nil, err
	}
	if err := repo.enrichEkycSession(ctx, session); err != nil {
		return nil, err
	}
	return session, nil
}

func (repo *backofficeRepository) SaveLivenessResult(ctx context.Context, params domain.SaveLivenessResultParams) (*domain.EkycSession, error) {
	var session *domain.EkycSession
	err := repo.withTx(ctx, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `DELETE FROM liveness_checks WHERE ekyc_session_id=$1`, params.SessionID); err != nil {
			return err
		}
		meta := []byte(`{}`)
		if params.Metadata != nil {
			meta, _ = json.Marshal(params.Metadata)
		}
		perGesture := []byte(`{}`)
		if params.PerGesture != nil {
			perGesture, _ = json.Marshal(params.PerGesture)
		}
		if _, err := tx.Exec(ctx, `
            INSERT INTO liveness_checks (ekyc_session_id, overall_result, per_gesture_result, recorded_video_url, raw_metadata)
            VALUES ($1,$2,$3::jsonb,$4,$5::jsonb)`,
			params.SessionID, params.Overall, perGesture, params.VideoURL, meta,
		); err != nil {
			return err
		}
		row := tx.QueryRow(ctx, `
            UPDATE ekyc_sessions
            SET liveness_overall = $2,
                liveness_status = $3,
                recorded_video_url = COALESCE($4, recorded_video_url),
                updated_at = NOW()
            WHERE id = $1
            RETURNING id, user_id, status, face_matching_status, liveness_status, final_decision,
                      id_card_url, selfie_with_id_url, recorded_video_url,
                      face_match_overall, liveness_overall, rejection_reason,
                      metadata, created_at, updated_at`,
			params.SessionID, params.Overall, params.Status, params.VideoURL,
		)
		result, err := scanEkycSessionRow(row)
		if err != nil {
			return err
		}
		session = result
		return nil
	})
	if err != nil {
		return nil, err
	}
	if err := repo.enrichEkycSession(ctx, session); err != nil {
		return nil, err
	}
	return session, nil
}

func (repo *backofficeRepository) AssignUserToSession(ctx context.Context, params domain.ApplicantSubmission) (*domain.EkycSession, error) {
	var session *domain.EkycSession
	err := repo.withTx(ctx, func(tx pgx.Tx) error {
		userID, err := repo.upsertBeneficiaryUser(ctx, tx, params)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `INSERT INTO beneficiaries (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, userID); err != nil {
			return err
		}
		applicantData := map[string]any{
			"name":        params.FullName,
			"nik":         params.Nik,
			"birthDate":   params.BirthDate,
			"address":     params.Address,
			"phone":       params.Phone,
			"email":       params.Email,
			"userId":      userID,
			"submittedAt": time.Now().UTC(),
		}
		metadataPatch, _ := json.Marshal(map[string]any{"applicant": applicantData})
		row := tx.QueryRow(ctx, `
            UPDATE ekyc_sessions
            SET user_id = $2,
                metadata = metadata || $3::jsonb,
                updated_at = NOW()
            WHERE id = $1
            RETURNING id, user_id, status, face_matching_status, liveness_status, final_decision,
                      id_card_url, selfie_with_id_url, recorded_video_url,
                      face_match_overall, liveness_overall, rejection_reason,
                      metadata, created_at, updated_at`,
			params.SessionID, userID, metadataPatch,
		)
		result, err := scanEkycSessionRow(row)
		if err != nil {
			return err
		}
		session = result
		return nil
	})
	if err != nil {
		return nil, err
	}
	if err := repo.enrichEkycSession(ctx, session); err != nil {
		return nil, err
	}
	return session, nil
}

func (repo *backofficeRepository) ListEkycSessions(ctx context.Context, params domain.ListEkycSessionsParams) ([]domain.EkycSession, error) {
	limit := params.Limit
	if limit <= 0 || limit > 500 {
		limit = 200
	}
	rows, err := repo.db.Query(ctx, `
        SELECT id, user_id, status, face_matching_status, liveness_status, final_decision,
               id_card_url, selfie_with_id_url, recorded_video_url,
               face_match_overall, liveness_overall, rejection_reason,
               metadata, created_at, updated_at
        FROM ekyc_sessions
        WHERE ($1 = '' OR status = $1)
          AND ($2 = '' OR final_decision = $2)
        ORDER BY created_at DESC
        LIMIT $3`,
		params.Status, params.FinalDecision, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []domain.EkycSession
	for rows.Next() {
		session, err := scanEkycSessionRow(rows)
		if err != nil {
			return nil, err
		}
		sessions = append(sessions, *session)
	}
	return sessions, rows.Err()
}

func (repo *backofficeRepository) GetEkycSession(ctx context.Context, id string) (*domain.EkycSession, error) {
	row := repo.db.QueryRow(ctx, `
        SELECT id, user_id, status, face_matching_status, liveness_status, final_decision,
               id_card_url, selfie_with_id_url, recorded_video_url,
               face_match_overall, liveness_overall, rejection_reason,
               metadata, created_at, updated_at
        FROM ekyc_sessions
        WHERE id = $1`, id)
	session, err := scanEkycSessionRow(row)
	if err != nil {
		return nil, err
	}
	if err := repo.enrichEkycSession(ctx, session); err != nil {
		return nil, err
	}
	return session, nil
}

func (repo *backofficeRepository) UpdateEkycDecision(ctx context.Context, params domain.UpdateEkycDecisionParams) (*domain.EkycSession, error) {
	row := repo.db.QueryRow(ctx, `
        UPDATE ekyc_sessions
        SET final_decision = $2,
            status = CASE WHEN $2 = 'PENDING' THEN status ELSE 'COMPLETED' END,
            rejection_reason = $3,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, user_id, status, face_matching_status, liveness_status, final_decision,
                  id_card_url, selfie_with_id_url, recorded_video_url,
                  face_match_overall, liveness_overall, rejection_reason,
                  metadata, created_at, updated_at`,
		params.SessionID, params.FinalDecision, params.Reason,
	)
	session, err := scanEkycSessionRow(row)
	if err != nil {
		return nil, err
	}
	if err := repo.enrichEkycSession(ctx, session); err != nil {
		return nil, err
	}
	return session, nil
}

func (repo *backofficeRepository) enrichEkycSession(ctx context.Context, session *domain.EkycSession) error {
	checks, err := repo.fetchFaceChecks(ctx, session.ID)
	if err != nil {
		return err
	}
	session.FaceChecks = checks

	live, err := repo.fetchLiveness(ctx, session.ID)
	if err != nil {
		return err
	}
	session.LivenessCheck = live
	return nil
}

func (repo *backofficeRepository) fetchFaceChecks(ctx context.Context, sessionID string) ([]domain.FaceCheck, error) {
	rows, err := repo.db.Query(ctx, `
        SELECT id, ekyc_session_id, step, similarity_score, threshold, result, raw_metadata, created_at
        FROM face_checks
        WHERE ekyc_session_id = $1
        ORDER BY created_at ASC`, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var checks []domain.FaceCheck
	for rows.Next() {
		var (
			check      domain.FaceCheck
			meta       []byte
			similarity sql.NullFloat64
			threshold  sql.NullFloat64
		)
		if err := rows.Scan(&check.ID, &check.SessionID, &check.Step, &similarity, &threshold, &check.Result, &meta, &check.CreatedAt); err != nil {
			return nil, err
		}
		if similarity.Valid {
			value := similarity.Float64
			check.Similarity = &value
		}
		if threshold.Valid {
			value := threshold.Float64
			check.Threshold = &value
		}
		check.RawMetadata = decodeJSON(meta)
		checks = append(checks, check)
	}
	return checks, rows.Err()
}

func (repo *backofficeRepository) fetchLiveness(ctx context.Context, sessionID string) (*domain.LivenessCheck, error) {
	row := repo.db.QueryRow(ctx, `
        SELECT id, ekyc_session_id, overall_result, per_gesture_result, recorded_video_url, raw_metadata, created_at
        FROM liveness_checks
        WHERE ekyc_session_id = $1
        ORDER BY created_at DESC
        LIMIT 1`, sessionID)
	var (
		check domain.LivenessCheck
		per   []byte
		raw   []byte
		video sql.NullString
	)
	if err := row.Scan(&check.ID, &check.SessionID, &check.OverallResult, &per, &video, &raw, &check.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	check.PerGestureResult = decodeJSON(per)
	if video.Valid {
		check.RecordedVideoURL = &video.String
	}
	check.RawMetadata = decodeJSON(raw)
	return &check, nil
}

func scanEkycSessionRow(row pgx.Row) (*domain.EkycSession, error) {
	var (
		session       domain.EkycSession
		userID        sql.NullString
		idCard        sql.NullString
		selfie        sql.NullString
		video         sql.NullString
		faceOverall   sql.NullString
		liveOverall   sql.NullString
		rejection     sql.NullString
		metadataBytes []byte
	)
	if err := row.Scan(
		&session.ID, &userID, &session.Status, &session.FaceMatchingStatus, &session.LivenessStatus, &session.FinalDecision,
		&idCard, &selfie, &video, &faceOverall, &liveOverall, &rejection,
		&metadataBytes, &session.CreatedAt, &session.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	if userID.Valid {
		session.UserID = &userID.String
	}
	if idCard.Valid {
		session.IDCardURL = &idCard.String
	}
	if selfie.Valid {
		session.SelfieWithIDURL = &selfie.String
	}
	if video.Valid {
		session.RecordedVideoURL = &video.String
	}
	if faceOverall.Valid {
		session.FaceMatchOverall = &faceOverall.String
	}
	if liveOverall.Valid {
		session.LivenessOverall = &liveOverall.String
	}
	if rejection.Valid {
		session.RejectionReason = &rejection.String
	}
	session.Metadata = decodeJSON(metadataBytes)
	return &session, nil
}

func (repo *backofficeRepository) upsertBeneficiaryUser(ctx context.Context, tx pgx.Tx, params domain.ApplicantSubmission) (string, error) {
	if params.Phone == "" && params.Nik == "" {
		return "", fmt.Errorf("phone atau NIK wajib diisi")
	}
	if params.Pin == "" {
		params.Pin = "123456"
	}
	var existingID string
	if params.Phone != "" {
		if err := tx.QueryRow(ctx, `SELECT id FROM users WHERE phone=$1 LIMIT 1`, params.Phone).Scan(&existingID); err == nil {
			return existingID, nil
		}
	}
	if params.Nik != "" && existingID == "" {
		if err := tx.QueryRow(ctx, `SELECT id FROM users WHERE nik=$1 LIMIT 1`, params.Nik).Scan(&existingID); err == nil {
			return existingID, nil
		}
	}

	id := uuid.New().String()
	var dob interface{}
	if params.BirthDate != nil {
		dob = params.BirthDate
	} else {
		dob = nil
	}
	meta, _ := json.Marshal(map[string]any{
		"address": params.Address,
	})
	_, err := tx.Exec(ctx, `
        INSERT INTO users (
            id, role, nik, name, dob, phone, email, pin_hash,
            region_prov, region_kab, region_kec, region_kel,
            region_scope, metadata
        ) VALUES (
            $1,'BENEFICIARY',$2,$3,$4,$5,$6,$7,
            '', '', '', '',
            ARRAY[]::text[], $8::jsonb
        )`,
		id, nullableString(params.Nik), params.FullName, dob, nullableString(params.Phone), nullableString(params.Email),
		fmt.Sprintf("plain:%s", params.Pin), meta,
	)
	if err != nil {
		return "", err
	}
	return id, nil
}

func nullableString(value string) interface{} {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return value
}
