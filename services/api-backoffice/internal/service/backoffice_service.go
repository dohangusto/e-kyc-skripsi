package service

import (
	"context"
	"errors"
	"fmt"
	"math"
	"math/rand"
	"strings"
	"time"

	"github.com/google/uuid"

	domain "e-kyc/services/api-backoffice/internal/domain"
)

var ErrNotFound = domain.ErrNotFound

type BackofficeService struct {
	repo domain.BackofficeRepository
}

var _ domain.BackofficeService = (*BackofficeService)(nil)

func NewBackofficeService(repo domain.BackofficeRepository) *BackofficeService {
	return &BackofficeService{repo: repo}
}

func (s *BackofficeService) ListApplications(ctx context.Context, limit int) ([]domain.Application, error) {
	if limit <= 0 {
		limit = 200
	}
	return s.repo.ListApplications(ctx, limit)
}

func (s *BackofficeService) GetApplication(ctx context.Context, id string) (*domain.Application, error) {
	return s.repo.GetApplication(ctx, id)
}

func (s *BackofficeService) ListUsers(ctx context.Context) ([]domain.User, error) {
	return s.repo.ListUsers(ctx)
}

func (s *BackofficeService) GetConfig(ctx context.Context) (*domain.SystemConfig, error) {
	return s.repo.GetConfig(ctx)
}

func (s *BackofficeService) UpdateConfig(ctx context.Context, cfg domain.SystemConfig) (*domain.SystemConfig, error) {
	if cfg.Thresholds == nil {
		cfg.Thresholds = map[string]any{}
	}
	if cfg.Features == nil {
		cfg.Features = map[string]any{}
	}
	return s.repo.UpsertConfig(ctx, cfg)
}

func (s *BackofficeService) UpdateApplicationStatus(ctx context.Context, appID, status, actor, reason string) error {
	action := fmt.Sprintf("STATUS:%s", status)
	params := domain.UpdateApplicationStatusParams{
		AppID:    appID,
		Status:   status,
		Timeline: timelineEntry(appID, actor, action, reason, nil),
		Audit:    auditEntry(actor, appID, action, reason, nil),
	}
	return s.repo.UpdateApplicationStatus(ctx, params)
}

func (s *BackofficeService) CreateVisit(ctx context.Context, appID, actor string, scheduledAt time.Time, tkskID string) (*domain.Visit, error) {
	visit := domain.Visit{
		ID:            fmt.Sprintf("VST-%d", time.Now().UnixNano()),
		ApplicationID: appID,
		ScheduledAt:   scheduledAt.UTC(),
		Status:        "PLANNED",
		TkskID:        tkskID,
		CreatedAt:     time.Now().UTC(),
	}

	if err := s.repo.CreateVisit(ctx, &visit, timelineEntry(appID, actor, "VISIT:CREATED", "", map[string]any{"visitId": visit.ID})); err != nil {
		return nil, err
	}
	return &visit, nil
}

func (s *BackofficeService) UpdateVisit(ctx context.Context, appID, visitID, actor string, payload domain.UpdateVisitPayload) error {
	var lat, lng *float64
	if payload.Geotag != nil {
		lat = &payload.Geotag.Lat
		lng = &payload.Geotag.Lng
	}
	action := "VISIT:UPDATED"
	if payload.Status != nil && *payload.Status != "" {
		action = fmt.Sprintf("VISIT:%s", *payload.Status)
	}
	params := domain.UpdateVisitParams{
		AppID:     appID,
		VisitID:   visitID,
		Status:    payload.Status,
		GeotagLat: lat,
		GeotagLng: lng,
		Photos:    payload.Photos,
		Checklist: payload.Checklist,
		Timeline:  timelineEntry(appID, actor, action, payload.Reason, map[string]any{"visitId": visitID}),
	}
	return s.repo.UpdateVisit(ctx, params)
}

func (s *BackofficeService) ListBatches(ctx context.Context) ([]domain.Batch, error) {
	return s.repo.ListBatches(ctx)
}

func (s *BackofficeService) CreateBatch(ctx context.Context, code string, applicationIDs []string, actor string) (*domain.Batch, error) {
	if code == "" {
		return nil, errors.New("code required")
	}
	if len(applicationIDs) == 0 {
		return nil, errors.New("items required")
	}
	batch := domain.Batch{
		ID:        fmt.Sprintf("BATCH-%d", time.Now().UnixNano()),
		Code:      code,
		Status:    "DRAFT",
		Items:     applicationIDs,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}

	audit := auditEntry(actor, batch.ID, "BATCH:CREATED", "", nil)
	if err := s.repo.CreateBatch(ctx, &batch, audit); err != nil {
		return nil, err
	}
	return &batch, nil
}

func (s *BackofficeService) UpdateBatchStatus(ctx context.Context, batchID, status, actor string) error {
	action := fmt.Sprintf("BATCH:%s", status)
	params := domain.UpdateBatchStatusParams{
		BatchID: batchID,
		Status:  status,
		Audit:   auditEntry(actor, batchID, action, "", nil),
	}
	return s.repo.UpdateBatchStatus(ctx, params)
}

func (s *BackofficeService) ListDistributions(ctx context.Context) ([]domain.Distribution, error) {
	return s.repo.ListDistributions(ctx)
}

func (s *BackofficeService) ListBatchesByUser(ctx context.Context, userID string) ([]domain.Batch, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, errors.New("user id required")
	}
	return s.repo.ListBatchesByUser(ctx, userID)
}

func (s *BackofficeService) ListBatchesByApplication(ctx context.Context, appID string) ([]domain.Batch, error) {
	if strings.TrimSpace(appID) == "" {
		return nil, errors.New("application id required")
	}
	return s.repo.ListBatchesByApplication(ctx, appID)
}

func (s *BackofficeService) CreateDistribution(ctx context.Context, dist *domain.Distribution, actor string) (*domain.Distribution, error) {
	dist.ID = fmt.Sprintf("DIST-%d", time.Now().UnixNano())
	dist.Status = "PLANNED"
	now := time.Now().UTC()
	dist.CreatedAt = now
	dist.UpdatedAt = now
	dist.CreatedBy = &actor
	dist.UpdatedBy = &actor

	userIDs, err := s.repo.NormalizeUserIDs(ctx, dist.Beneficiaries)
	if err != nil {
		return nil, err
	}
	dist.Beneficiaries = userIDs

	audit := auditEntry(actor, dist.ID, "DISTRIBUTION:CREATED", "", nil)
	if err := s.repo.CreateDistribution(ctx, dist, audit); err != nil {
		return nil, err
	}
	return dist, nil
}

func (s *BackofficeService) UpdateDistributionStatus(ctx context.Context, distID, status, actor string) error {
	action := fmt.Sprintf("DISTRIBUTION:%s", status)
	params := domain.UpdateDistributionStatusParams{
		DistributionID: distID,
		Status:         status,
		Audit:          auditEntry(actor, distID, action, "", nil),
	}
	return s.repo.UpdateDistributionStatus(ctx, params)
}

func (s *BackofficeService) NotifyDistribution(ctx context.Context, distID string, userIDs []string, actor string) error {
	if len(userIDs) == 0 {
		return nil
	}
	normalized, err := s.repo.NormalizeUserIDs(ctx, userIDs)
	if err != nil {
		return err
	}
	params := domain.NotifyDistributionParams{
		DistributionID: distID,
		UserIDs:        normalized,
		Actor:          actor,
		Audit:          auditEntry(actor, distID, "DISTRIBUTION:NOTIFIED", strings.Join(normalized, ","), nil),
	}
	return s.repo.NotifyDistribution(ctx, params)
}

func (s *BackofficeService) ListClusteringRuns(ctx context.Context) ([]domain.ClusteringRun, error) {
	return s.repo.ListClusteringRuns(ctx)
}

func (s *BackofficeService) GetClusteringRun(ctx context.Context, runID string) (*domain.ClusteringRun, error) {
	return s.repo.GetClusteringRun(ctx, runID)
}

func (s *BackofficeService) AssignClusteringCandidate(ctx context.Context, runID, candidateID, tkskID, actor string) error {
	action := fmt.Sprintf("CLUSTER_ASSIGN:%s", tkskID)
	params := domain.AssignClusteringCandidateParams{
		RunID:       runID,
		CandidateID: candidateID,
		TkskID:      tkskID,
		Audit:       auditEntry(actor, fmt.Sprintf("%s:%s", runID, candidateID), action, "", nil),
	}
	return s.repo.AssignClusteringCandidate(ctx, params)
}

func (s *BackofficeService) UpdateClusteringCandidateStatus(ctx context.Context, runID, candidateID, status, actor, notes string) error {
	action := fmt.Sprintf("CLUSTER_STATUS:%s", status)
	params := domain.UpdateClusteringCandidateStatusParams{
		RunID:       runID,
		CandidateID: candidateID,
		Status:      status,
		Actor:       actor,
		Notes:       notes,
		Audit:       auditEntry(actor, fmt.Sprintf("%s:%s", runID, candidateID), action, notes, nil),
	}
	return s.repo.UpdateClusteringCandidateStatus(ctx, params)
}

func (s *BackofficeService) TriggerClusteringRun(ctx context.Context, operator string, payload domain.ClusteringRunPayload) (*domain.ClusteringRun, error) {
	if operator == "" {
		return nil, errors.New("operator required")
	}
	if payload.SampleSize <= 0 {
		payload.SampleSize = 120
	}
	beneficiaries, err := s.repo.ListBeneficiaries(ctx, payload.SampleSize)
	if err != nil {
		return nil, err
	}
	if len(beneficiaries) == 0 {
		return nil, errors.New("no beneficiaries available for clustering")
	}

	now := time.Now().UTC()
	runID := fmt.Sprintf("CLUST-%d", now.UnixNano())
	randSrc := rand.New(rand.NewSource(now.UnixNano()))

	var tinggi, sedang, rendah int
	candidates := make([]domain.ClusteringCandidate, 0, len(beneficiaries))
	for _, bene := range beneficiaries {
		priority := priorityFromRanking(bene.RankingBansosUtama)
		switch priority {
		case "TINGGI":
			tinggi++
		case "SEDANG":
			sedang++
		default:
			rendah++
		}
		cluster := "LAINNYA"
		if bene.BansosUtama != nil && strings.TrimSpace(*bene.BansosUtama) != "" {
			cluster = strings.ToUpper(strings.TrimSpace(*bene.BansosUtama))
		}
		score := scoreForPriority(priority, randSrc)
		household := 1
		candidate := domain.ClusteringCandidate{
			ID:            uuid.NewString(),
			UserID:        bene.User.ID,
			RunID:         runID,
			Name:          bene.User.Name,
			NikMask:       maskNikPointer(bene.User.NIK),
			Region:        bene.User.Region,
			Cluster:       cluster,
			Priority:      priority,
			Score:         score,
			HouseholdSize: household,
			Status:        "PENDING_REVIEW",
		}
		candidates = append(candidates, candidate)
	}

	finished := now.Add(2 * time.Second)
	parameters := map[string]any{
		"dataset":   payload.Dataset,
		"window":    payload.Window,
		"algorithm": payload.Algorithm,
	}
	summary := map[string]any{
		"total":  len(candidates),
		"tinggi": tinggi,
		"sedang": sedang,
		"rendah": rendah,
	}
	run := domain.ClusteringRun{
		ID:         runID,
		Operator:   operator,
		StartedAt:  now,
		FinishedAt: &finished,
		Parameters: parameters,
		Summary:    summary,
		Candidates: candidates,
	}
	audit := auditEntry(operator, runID, "CLUSTERING:CREATED", fmt.Sprintf("%s/%s/%s", payload.Dataset, payload.Window, payload.Algorithm), nil)
	if err := s.repo.CreateClusteringRun(ctx, &run, audit, candidates); err != nil {
		return nil, err
	}
	created, err := s.repo.GetClusteringRun(ctx, runID)
	if err != nil {
		return nil, err
	}
	return created, nil
}

func (s *BackofficeService) ListAuditLogs(ctx context.Context, limit int) ([]domain.AuditLog, error) {
	if limit <= 0 {
		limit = 200
	}
	return s.repo.ListAuditLogs(ctx, limit)
}

func (s *BackofficeService) Overview(ctx context.Context) (map[string]any, error) {
	return s.repo.Overview(ctx)
}

func (s *BackofficeService) ListVisits(ctx context.Context, params domain.ListVisitsParams) ([]domain.Visit, error) {
	if params.Limit <= 0 {
		params.Limit = 200
	}
	return s.repo.ListVisits(ctx, params)
}

func (s *BackofficeService) GetSurvey(ctx context.Context, appID string) (*domain.SurveyState, error) {
	if strings.TrimSpace(appID) == "" {
		return nil, errors.New("application id required")
	}
	return s.repo.GetSurvey(ctx, appID)
}

func (s *BackofficeService) SaveSurveyDraft(ctx context.Context, params domain.SurveyDraftParams) (*domain.SurveyState, error) {
	params.ApplicationID = strings.TrimSpace(params.ApplicationID)
	if params.ApplicationID == "" {
		return nil, errors.New("application id required")
	}
	if params.Answers == nil {
		params.Answers = map[string]any{}
	}
	if strings.TrimSpace(params.Status) == "" {
		params.Status = "belum-dikumpulkan"
	}
	return s.repo.SaveSurveyDraft(ctx, params)
}

func (s *BackofficeService) SubmitSurvey(ctx context.Context, params domain.SurveySubmitParams) (*domain.SurveyState, error) {
	params.ApplicationID = strings.TrimSpace(params.ApplicationID)
	if params.ApplicationID == "" {
		return nil, errors.New("application id required")
	}
	if params.Answers == nil {
		params.Answers = map[string]any{}
	}
	if strings.TrimSpace(params.Status) == "" {
		params.Status = "antrean"
	}
	return s.repo.SubmitSurvey(ctx, params)
}

func timelineEntry(appID, actor, action, reason string, metadata map[string]any) domain.TimelineEntry {
	return domain.TimelineEntry{
		ApplicationID: appID,
		Actor:         actor,
		Action:        action,
		Reason:        reason,
		Metadata:      metadata,
	}
}

func auditEntry(actor, entity, action, reason string, metadata map[string]any) domain.AuditEntry {
	return domain.AuditEntry{
		Actor:    actor,
		Entity:   entity,
		Action:   action,
		Reason:   reason,
		Metadata: metadata,
	}
}

func maskNikPointer(nik *string) string {
	if nik == nil {
		return ""
	}
	value := strings.TrimSpace(*nik)
	if len(value) <= 4 {
		return value
	}
	maskLen := len(value) - 4
	return strings.Repeat("*", maskLen) + value[maskLen:]
}

func priorityFromRanking(rank *int) string {
	if rank == nil || *rank <= 0 {
		return "SEDANG"
	}
	switch {
	case *rank <= 100:
		return "TINGGI"
	case *rank <= 400:
		return "SEDANG"
	default:
		return "RENDAH"
	}
}

func scoreForPriority(priority string, r *rand.Rand) float64 {
	base := 0.65
	switch priority {
	case "TINGGI":
		base = 0.9
	case "SEDANG":
		base = 0.75
	case "RENDAH":
		base = 0.6
	}
	jitter := (r.Float64() - 0.5) * 0.2
	score := base + jitter
	if score > 0.99 {
		score = 0.99
	}
	if score < 0.45 {
		score = 0.45
	}
	return math.Round(score*100) / 100
}
