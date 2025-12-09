package domain

import (
	"context"
	"errors"
	"time"

	"github.com/labstack/echo/v4"
)

var (
	ErrNotFound     = errors.New("not found")
	ErrInvalidState = errors.New("invalid state")
)

type TimelineEntry struct {
	ApplicationID string
	Actor         string
	Action        string
	Reason        string
	Metadata      map[string]any
}

type AuditEntry struct {
	Actor    string
	Entity   string
	Action   string
	Reason   string
	Metadata map[string]any
}

type UpdateApplicationStatusParams struct {
	AppID    string
	Status   string
	Timeline TimelineEntry
	Audit    AuditEntry
}

type UpdateVisitParams struct {
	AppID     string
	VisitID   string
	Status    *string
	GeotagLat *float64
	GeotagLng *float64
	Photos    []string
	Checklist map[string]any
	Timeline  TimelineEntry
}

type UpdateBatchStatusParams struct {
	BatchID string
	Status  string
	Audit   AuditEntry
}

type UpdateDistributionStatusParams struct {
	DistributionID string
	Status         string
	Audit          AuditEntry
}

type NotifyDistributionParams struct {
	DistributionID string
	ApplicationIDs []string
	Actor          string
	Message        string
	Category       string
	AttachmentURL  *string
	Audit          AuditEntry
}

type ListVisitsParams struct {
	ApplicationID string
	TkskID        string
	Status        string
	From          *time.Time
	To            *time.Time
	Limit         int
}

type AssignClusteringCandidateParams struct {
	RunID       string
	CandidateID string
	TkskID      string
	Audit       AuditEntry
}

type UpdateClusteringCandidateStatusParams struct {
	RunID       string
	CandidateID string
	Status      string
	Actor       string
	Notes       string
	Audit       AuditEntry
}

type UpdateVisitPayload struct {
	Status *string `json:"status"`
	Geotag *struct {
		Lat float64 `json:"lat"`
		Lng float64 `json:"lng"`
	} `json:"geotag"`
	Photos    []string       `json:"photos"`
	Checklist map[string]any `json:"checklist"`
	Reason    string         `json:"reason"`
}

type ClusteringRunPayload struct {
	Dataset    string
	Window     string
	Algorithm  string
	SampleSize int
}

type SurveyDraftParams struct {
	ApplicationID string
	Answers       map[string]any
	Status        string
}

type SurveySubmitParams struct {
	ApplicationID string
	Answers       map[string]any
	Status        string
}

// REPOSITORIES
type BackofficeRepository interface {
	ListApplications(ctx context.Context, limit int) ([]Application, error)
	GetApplication(ctx context.Context, id string) (*Application, error)
	GetApplicationsByIDs(ctx context.Context, ids []string) ([]Application, error)
	ListUsers(ctx context.Context) ([]User, error)
	ListBeneficiaries(ctx context.Context, limit int) ([]Beneficiary, error)
	GetConfig(ctx context.Context) (*SystemConfig, error)
	UpsertConfig(ctx context.Context, cfg SystemConfig) (*SystemConfig, error)
	ListBatchesByUser(ctx context.Context, userID string) ([]Batch, error)
	ListBatchesByApplication(ctx context.Context, appID string) ([]Batch, error)
	ListDistributionsByApplication(ctx context.Context, appID string) ([]Distribution, error)

	UpdateApplicationStatus(ctx context.Context, params UpdateApplicationStatusParams) error
	CreateVisit(ctx context.Context, visit *Visit, timeline TimelineEntry) error
	UpdateVisit(ctx context.Context, params UpdateVisitParams) error

	ListBatches(ctx context.Context) ([]Batch, error)
	CreateBatch(ctx context.Context, batch *Batch, audit AuditEntry) error
	UpdateBatchStatus(ctx context.Context, params UpdateBatchStatusParams) error

	ListDistributions(ctx context.Context) ([]Distribution, error)
	GetDistribution(ctx context.Context, id string) (*Distribution, error)
	CreateDistribution(ctx context.Context, dist *Distribution, audit AuditEntry) error
	UpdateDistributionStatus(ctx context.Context, params UpdateDistributionStatusParams) error
	NotifyDistribution(ctx context.Context, params NotifyDistributionParams) error
	ListVisits(ctx context.Context, params ListVisitsParams) ([]Visit, error)
	ListNotificationsByUser(ctx context.Context, userID string, limit int) ([]Notification, error)

	ListClusteringRuns(ctx context.Context) ([]ClusteringRun, error)
	GetClusteringRun(ctx context.Context, runID string) (*ClusteringRun, error)
	CreateClusteringRun(ctx context.Context, run *ClusteringRun, audit AuditEntry, candidates []ClusteringCandidate) error
	AssignClusteringCandidate(ctx context.Context, params AssignClusteringCandidateParams) error
	UpdateClusteringCandidateStatus(ctx context.Context, params UpdateClusteringCandidateStatusParams) error

	ListAuditLogs(ctx context.Context, limit int) ([]AuditLog, error)
	Overview(ctx context.Context) (map[string]any, error)

	NormalizeUserIDs(ctx context.Context, ids []string) ([]string, error)

	EkycRepository

	GetSurvey(ctx context.Context, applicationID string) (*SurveyState, error)
	SaveSurveyDraft(ctx context.Context, params SurveyDraftParams) (*SurveyState, error)
	SubmitSurvey(ctx context.Context, params SurveySubmitParams) (*SurveyState, error)
}

// SERVICES
type BackofficeService interface {
	ListApplications(ctx context.Context, limit int) ([]Application, error)
	GetApplication(ctx context.Context, id string) (*Application, error)
	ListUsers(ctx context.Context) ([]User, error)
	GetConfig(ctx context.Context) (*SystemConfig, error)
	UpdateConfig(ctx context.Context, cfg SystemConfig) (*SystemConfig, error)

	UpdateApplicationStatus(ctx context.Context, appID, status, actor, reason string) error

	CreateVisit(ctx context.Context, appID, actor string, scheduledAt time.Time, tkskID string) (*Visit, error)
	UpdateVisit(ctx context.Context, appID, visitID, actor string, payload UpdateVisitPayload) error

	ListBatches(ctx context.Context) ([]Batch, error)
	CreateBatch(ctx context.Context, code string, applicationIDs []string, actor string) (*Batch, error)
	UpdateBatchStatus(ctx context.Context, batchID, status, actor string) error

	ListDistributions(ctx context.Context) ([]Distribution, error)
	CreateDistribution(ctx context.Context, dist *Distribution, actor string) (*Distribution, error)
	UpdateDistributionStatus(ctx context.Context, distID, status, actor string) error
	NotifyDistribution(ctx context.Context, distID string, applicationIDs []string, actor string) error
	ListVisits(ctx context.Context, params ListVisitsParams) ([]Visit, error)
	ListBatchesByApplication(ctx context.Context, appID string) ([]Batch, error)
	ListDistributionsByApplication(ctx context.Context, appID string) ([]Distribution, error)
	ListNotificationsByUser(ctx context.Context, userID string, limit int) ([]Notification, error)

	ListClusteringRuns(ctx context.Context) ([]ClusteringRun, error)
	GetClusteringRun(ctx context.Context, runID string) (*ClusteringRun, error)
	AssignClusteringCandidate(ctx context.Context, runID, candidateID, tkskID, actor string) error
	UpdateClusteringCandidateStatus(ctx context.Context, runID, candidateID, status, actor, notes string) error
	TriggerClusteringRun(ctx context.Context, operator string, payload ClusteringRunPayload) (*ClusteringRun, error)

	ListAuditLogs(ctx context.Context, limit int) ([]AuditLog, error)
	Overview(ctx context.Context) (map[string]any, error)

	ListBatchesByUser(ctx context.Context, userID string) ([]Batch, error)
	GetSurvey(ctx context.Context, applicationID string) (*SurveyState, error)
	SaveSurveyDraft(ctx context.Context, params SurveyDraftParams) (*SurveyState, error)
	SubmitSurvey(ctx context.Context, params SurveySubmitParams) (*SurveyState, error)
}

// HTTP HANDLERS
type BackofficeHTTPHandler interface {
	ListApplications(ctx echo.Context) error
	GetApplication(ctx echo.Context) error
	UpdateApplicationStatus(ctx echo.Context) error
	CreateVisit(ctx echo.Context) error
	UpdateVisit(ctx echo.Context) error
	ListUsers(ctx echo.Context) error
	GetConfig(ctx echo.Context) error
	UpdateConfig(ctx echo.Context) error
	ListBatches(ctx echo.Context) error
	CreateBatch(ctx echo.Context) error
	UpdateBatchStatus(ctx echo.Context) error
	ListDistributions(ctx echo.Context) error
	CreateDistribution(ctx echo.Context) error
	UpdateDistributionStatus(ctx echo.Context) error
	NotifyDistribution(ctx echo.Context) error
	ListVisits(ctx echo.Context) error
	ListClusteringRuns(ctx echo.Context) error
	TriggerClusteringRun(ctx echo.Context) error
	GetClusteringRun(ctx echo.Context) error
	AssignClusteringCandidate(ctx echo.Context) error
	UpdateClusteringCandidateStatus(ctx echo.Context) error
	ListAuditLogs(ctx echo.Context) error
	Overview(ctx echo.Context) error
}
