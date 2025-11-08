package service

import (
	"context"
	"encoding/json"
	"errors"

	domain "e-kyc/services/api-backoffice/internal/domain"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("not found")

type BackofficeService struct {
	db *pgxpool.Pool
}

func NewBackofficeService(db *pgxpool.Pool) *BackofficeService {
	return &BackofficeService{db: db}
}

func (s *BackofficeService) ListApplications(ctx context.Context, limit int) ([]domain.Application, error) {
	if limit <= 0 {
		limit = 200
	}

	rows, err := s.db.Query(ctx, `
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
	return apps, nil
}

func (s *BackofficeService) GetApplication(ctx context.Context, id string) (*domain.Application, error) {
	var (
		app        domain.Application
		phone      string
		assignedTo *string
	)

	row := s.db.QueryRow(ctx, `
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
			return nil, ErrNotFound
		}
		return nil, err
	}
	app.ApplicantPhone = phone
	app.AssignedTo = assignedTo

	docs, err := s.fetchDocuments(ctx, id)
	if err != nil {
		return nil, err
	}
	app.Documents = docs

	visits, err := s.fetchVisits(ctx, id)
	if err != nil {
		return nil, err
	}
	app.Visits = visits

	timeline, err := s.fetchTimeline(ctx, id)
	if err != nil {
		return nil, err
	}
	app.Timeline = timeline

	survey, err := s.fetchSurvey(ctx, id)
	if err != nil {
		return nil, err
	}
	if survey != nil {
		app.Survey = survey
	}

	return &app, nil
}

func (s *BackofficeService) fetchDocuments(ctx context.Context, appID string) ([]domain.Document, error) {
	rows, err := s.db.Query(ctx, `
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

func (s *BackofficeService) fetchVisits(ctx context.Context, appID string) ([]domain.Visit, error) {
	rows, err := s.db.Query(ctx, `
        SELECT id, application_id, scheduled_at, geotag_lat, geotag_lng, photos, checklist, status, COALESCE(tksk_id, ''), created_at
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

func (s *BackofficeService) fetchTimeline(ctx context.Context, appID string) ([]domain.TimelineItem, error) {
	rows, err := s.db.Query(ctx, `
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

func (s *BackofficeService) fetchSurvey(ctx context.Context, appID string) (*domain.SurveyState, error) {
	var (
		state   domain.SurveyState
		answers []byte
	)

	row := s.db.QueryRow(ctx, `
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
