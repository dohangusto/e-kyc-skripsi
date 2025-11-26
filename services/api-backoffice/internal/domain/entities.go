package domain

import "time"

type Beneficiary struct {
	User
	BansosUtama            *string
	RankingBansosUtama     *int
	BansosPendukung        *string
	RankingBansosPendukung *int
	PortalFlags            map[string]any
}

type Application struct {
	ID               string
	ApplicantName    string
	ApplicantNikMask string
	ApplicantDOB     time.Time
	ApplicantPhone   string
	Region           Region
	Status           string
	AssignedTo       *string
	AgingDays        int
	ScoreOCR         float64
	ScoreFace        float64
	ScoreLiveness    string
	Flags            map[string]any
	CreatedAt        time.Time
	UpdatedAt        time.Time
	Documents        []Document
	Visits           []Visit
	Timeline         []TimelineItem
	Survey           *SurveyState
	Portal           *PortalInfo
}

type Region struct {
	Prov string
	Kab  string
	Kec  string
	Kel  string
}

type Document struct {
	ID            string
	ApplicationID string
	Type          string
	URL           string
	SHA256        string
	CreatedAt     time.Time
}

type Visit struct {
	ID            string
	ApplicationID string
	ScheduledAt   time.Time
	GeotagLat     *float64
	GeotagLng     *float64
	Photos        []string
	Checklist     map[string]any
	Status        string
	TkskID        string
	CreatedAt     time.Time
}

type TimelineItem struct {
	ID            int64
	ApplicationID string
	OccurredAt    time.Time
	Actor         string
	Action        string
	Reason        *string
	Metadata      map[string]any
}

type SurveyState struct {
	ApplicationID     string
	BeneficiaryUserID string
	Completed         bool
	SubmittedAt       *time.Time
	Status            *string
	Answers           map[string]any
}

type PortalInfo struct {
	ApplicationID      string
	Phone              string
	Email              *string
	PIN                *string
	VerificationStatus *string
	FaceMatchPassed    *bool
	LivenessPassed     *bool
}

type User struct {
	ID          string
	Role        string
	NIK         *string
	Name        string
	DOB         *time.Time
	Phone       *string
	Email       *string
	Region      Region
	RegionScope []string
	Metadata    map[string]any
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type Batch struct {
	ID        string
	Code      string
	Status    string
	Checksum  *string
	CreatedAt time.Time
	UpdatedAt time.Time
	Items     []string
}

type Distribution struct {
	ID            string
	Name          string
	ScheduledAt   time.Time
	Channel       string
	Location      string
	Status        string
	Notes         *string
	CreatedBy     *string
	CreatedAt     time.Time
	UpdatedBy     *string
	UpdatedAt     time.Time
	BatchCodes    []string
	Beneficiaries []string
	Notified      []string
}

type ClusteringRun struct {
	ID         string
	Operator   string
	StartedAt  time.Time
	FinishedAt *time.Time
	Parameters map[string]any
	Summary    map[string]any
	Candidates []ClusteringCandidate
}

type ClusteringCandidate struct {
	ID            string
	UserID        string `json:"-"`
	RunID         string
	Name          string
	NikMask       string
	Region        Region
	Cluster       string
	Priority      string
	Score         float64
	HouseholdSize int
	Status        string
	AssignedTo    *string
	Reviewer      *string
	ReviewedAt    *time.Time
	Notes         *string
}

type AuditLog struct {
	ID         int64
	OccurredAt time.Time
	Actor      string
	Entity     string
	Action     string
	Reason     *string
	Metadata   map[string]any
}

type SystemConfig struct {
	Period     string
	Thresholds map[string]any
	Features   map[string]any
	UpdatedAt  time.Time
}
