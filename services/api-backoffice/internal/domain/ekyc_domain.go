package domain

import (
	"context"
	"time"

	"github.com/labstack/echo/v4"
)

type EkycSession struct {
	ID                 string         `json:"id"`
	UserID             *string        `json:"userId,omitempty"`
	Status             string         `json:"status"`
	FaceMatchingStatus string         `json:"faceMatchingStatus"`
	LivenessStatus     string         `json:"livenessStatus"`
	FinalDecision      string         `json:"finalDecision"`
	IDCardURL          *string        `json:"idCardUrl,omitempty"`
	SelfieWithIDURL    *string        `json:"selfieWithIdUrl,omitempty"`
	RecordedVideoURL   *string        `json:"recordedVideoUrl,omitempty"`
	FaceMatchOverall   *string        `json:"faceMatchOverall,omitempty"`
	LivenessOverall    *string        `json:"livenessOverall,omitempty"`
	RejectionReason    *string        `json:"rejectionReason,omitempty"`
	Metadata           map[string]any `json:"metadata"`
	CreatedAt          time.Time      `json:"createdAt"`
	UpdatedAt          time.Time      `json:"updatedAt"`
	FaceChecks         []FaceCheck    `json:"faceChecks,omitempty"`
	LivenessCheck      *LivenessCheck `json:"livenessCheck,omitempty"`
}

type FaceCheck struct {
	ID          string         `json:"id"`
	SessionID   string         `json:"ekycSessionId"`
	Step        string         `json:"step"`
	Similarity  *float64       `json:"similarityScore,omitempty"`
	Threshold   *float64       `json:"threshold,omitempty"`
	Result      string         `json:"result"`
	RawMetadata map[string]any `json:"rawMetadata"`
	CreatedAt   time.Time      `json:"createdAt"`
}

type LivenessCheck struct {
	ID               string         `json:"id"`
	SessionID        string         `json:"ekycSessionId"`
	OverallResult    string         `json:"overallResult"`
	PerGestureResult map[string]any `json:"perGestureResult"`
	RecordedVideoURL *string        `json:"recordedVideoUrl,omitempty"`
	RawMetadata      map[string]any `json:"rawMetadata"`
	CreatedAt        time.Time      `json:"createdAt"`
}

type CreateEkycSessionParams struct {
	UserID *string `json:"userId"`
}

type UpdateEkycArtifactsParams struct {
	SessionID          string
	IDCardURL          *string
	SelfieWithIDURL    *string
	RecordedVideoURL   *string
	Status             *string
	FaceMatchingStatus *string
	LivenessStatus     *string
}

type FaceCheckInput struct {
	Step       string         `json:"step"`
	Similarity *float64       `json:"similarityScore,omitempty"`
	Threshold  *float64       `json:"threshold,omitempty"`
	Result     string         `json:"result"`
	Metadata   map[string]any `json:"rawMetadata"`
}

type SaveFaceChecksParams struct {
	SessionID string           `json:"sessionId"`
	Checks    []FaceCheckInput `json:"checks"`
	Overall   string           `json:"overallResult"`
	Status    string           `json:"status"`
}

type SaveLivenessResultParams struct {
	SessionID  string         `json:"sessionId"`
	Overall    string         `json:"overallResult"`
	PerGesture map[string]any `json:"perGestureResult"`
	VideoURL   *string        `json:"recordedVideoUrl"`
	Status     string         `json:"status"`
	Metadata   map[string]any `json:"rawMetadata"`
}

type ApplicantSubmission struct {
	SessionID string
	FullName  string
	Nik       string
	BirthDate *time.Time
	Address   string
	Phone     string
	Email     string
	Pin       string
}

type ListEkycSessionsParams struct {
	Status        string
	FinalDecision string
	Limit         int
}

type UpdateEkycDecisionParams struct {
	SessionID     string  `json:"sessionId"`
	FinalDecision string  `json:"finalDecision"`
	Reason        *string `json:"reason"`
}

type EkycRepository interface {
	CreateEkycSession(ctx context.Context, params CreateEkycSessionParams) (*EkycSession, error)
	UpdateEkycSession(ctx context.Context, params UpdateEkycArtifactsParams) (*EkycSession, error)
	SaveFaceChecks(ctx context.Context, params SaveFaceChecksParams) (*EkycSession, error)
	SaveLivenessResult(ctx context.Context, params SaveLivenessResultParams) (*EkycSession, error)
	AssignUserToSession(ctx context.Context, params ApplicantSubmission) (*EkycSession, error)
	ListEkycSessions(ctx context.Context, params ListEkycSessionsParams) ([]EkycSession, error)
	GetEkycSession(ctx context.Context, id string) (*EkycSession, error)
	UpdateEkycDecision(ctx context.Context, params UpdateEkycDecisionParams) (*EkycSession, error)
	EnsureApplicationFromSession(ctx context.Context, sessionID string) error
}

type EkycService interface {
	CreateSession(ctx context.Context, params CreateEkycSessionParams) (*EkycSession, error)
	UpdateArtifacts(ctx context.Context, params UpdateEkycArtifactsParams) (*EkycSession, error)
	RecordFaceChecks(ctx context.Context, params SaveFaceChecksParams) (*EkycSession, error)
	RecordLiveness(ctx context.Context, params SaveLivenessResultParams) (*EkycSession, error)
	AssignApplicant(ctx context.Context, params ApplicantSubmission) (*EkycSession, error)
	ListSessions(ctx context.Context, params ListEkycSessionsParams) ([]EkycSession, error)
	GetSession(ctx context.Context, id string) (*EkycSession, error)
	FinalizeSession(ctx context.Context, id string) (*EkycSession, error)
	OverrideDecision(ctx context.Context, params UpdateEkycDecisionParams) (*EkycSession, error)
}

type EkycHTTPHandler interface {
	CreateSession(c echo.Context) error
	UpdateArtifacts(c echo.Context) error
	RecordFaceChecks(c echo.Context) error
	RecordLiveness(c echo.Context) error
	AssignApplicant(c echo.Context) error
	ListSessions(c echo.Context) error
	GetSession(c echo.Context) error
	Finalize(c echo.Context) error
	OverrideDecision(c echo.Context) error
}
