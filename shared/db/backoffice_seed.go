package db

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SeedBackoffice populates the shared Postgres with beneficiary + submission data
// consumed by both the self-service (react-main) and backoffice portals.
func SeedBackoffice(ctx context.Context, pool *pgxpool.Pool) error {
	return WithTx(ctx, pool, func(tx pgx.Tx) error {
		if err := seedUsers(ctx, tx); err != nil {
			return err
		}
		if err := seedBeneficiaries(ctx, tx); err != nil {
			return err
		}
		if err := seedConfig(ctx, tx); err != nil {
			return err
		}
		if err := seedApplications(ctx, tx); err != nil {
			return err
		}
		if err := seedBatches(ctx, tx); err != nil {
			return err
		}
		if err := seedDistributions(ctx, tx); err != nil {
			return err
		}
		if err := seedClustering(ctx, tx); err != nil {
			return err
		}
		return nil
	})
}

type regionSeed struct {
	Prov string
	Kab  string
	Kec  string
	Kel  string
}

type beneficiarySeed struct {
	ID              string
	Nik             string
	Name            string
	DOB             string
	Phone           string
	Email           string
	Region          regionSeed
	HouseholdSize   int
	ClusterCategory string
	ClusterPriority string
	Portal          portalSeed
}

type portalSeed struct {
	Phone              string
	Email              string
	PIN                string
	VerificationStatus string
	FaceMatchPassed    bool
	LivenessPassed     bool
}

const (
	operatorAdminID = "00000000-0000-0000-0000-000000000001"
	operatorTkskID  = "00000000-0000-0000-0000-000000000003"
	operatorAudID   = "00000000-0000-0000-0000-000000000004"
)

var beneficiaries = []beneficiarySeed{
	{
		ID:              "11111111-1111-1111-1111-111111111111",
		Nik:             "3271011234560001",
		Name:            "Siti Aminah",
		DOB:             "1987-04-12",
		Phone:           "08123450001",
		Email:           "siti.aminah@contoh.id",
		Region:          regionSeed{"Kepri", "Batam", "Sekupang", "Tg Riau"},
		HouseholdSize:   4,
		ClusterCategory: "PKH",
		ClusterPriority: "TINGGI",
		Portal: portalSeed{
			Phone:              "08123450001",
			Email:              "siti.aminah@contoh.id",
			PIN:                "123456",
			VerificationStatus: "SEDANG_DITINJAU",
			FaceMatchPassed:    true,
			LivenessPassed:     true,
		},
	},
	{
		ID:              "22222222-2222-2222-2222-222222222222",
		Nik:             "3271012234560002",
		Name:            "Rahmat Hidayat",
		DOB:             "1984-06-21",
		Phone:           "08123450002",
		Email:           "rahmat.hidayat@contoh.id",
		Region:          regionSeed{"Kepri", "Batam", "Batam Kota", "Belian"},
		HouseholdSize:   3,
		ClusterCategory: "BPNT",
		ClusterPriority: "SEDANG",
		Portal: portalSeed{
			Phone:              "08123450002",
			Email:              "rahmat.hidayat@contoh.id",
			PIN:                "222333",
			VerificationStatus: "SEDANG_DITINJAU",
			FaceMatchPassed:    true,
			LivenessPassed:     true,
		},
	},
	{
		ID:              "33333333-3333-3333-3333-333333333333",
		Nik:             "3271013234560003",
		Name:            "Andi Pratama",
		DOB:             "1990-01-19",
		Phone:           "08123450003",
		Email:           "andi.pratama@contoh.id",
		Region:          regionSeed{"Kepri", "Batam", "Sagulung", "Sungai Langkai"},
		HouseholdSize:   5,
		ClusterCategory: "PKH",
		ClusterPriority: "TINGGI",
		Portal: portalSeed{
			Phone:              "08123450003",
			Email:              "andi.pratama@contoh.id",
			PIN:                "654321",
			VerificationStatus: "DISETUJUI",
			FaceMatchPassed:    true,
			LivenessPassed:     true,
		},
	},
	{
		ID:              "44444444-4444-4444-4444-444444444444",
		Nik:             "3271014234560004",
		Name:            "Lestari Dewi",
		DOB:             "1994-09-02",
		Phone:           "08123450004",
		Email:           "lestari.dewi@contoh.id",
		Region:          regionSeed{"Kepri", "Batam", "Batu Aji", "Buliang"},
		HouseholdSize:   2,
		ClusterCategory: "BPNT",
		ClusterPriority: "SEDANG",
		Portal: portalSeed{
			Phone:              "08123450004",
			Email:              "lestari.dewi@contoh.id",
			PIN:                "987654",
			VerificationStatus: "SEDANG_DITINJAU",
			FaceMatchPassed:    true,
			LivenessPassed:     true,
		},
	},
}

type scoreSeed struct {
	OCR      float64
	Face     float64
	Liveness string
}

type flagSeed struct {
	DuplicateNik  bool
	DuplicateFace bool
	DeviceAnomaly bool
	Similarity    float64
	Candidates    []map[string]any
}

type documentSeed struct {
	ID   string
	Type string
	URL  string
	Hash string
}

type visitSeed struct {
	ID          string
	ScheduledAt string
	Status      string
	TkskID      string
}

type timelineSeed struct {
	At     string
	By     string
	Action string
	Reason *string
}

type surveySeed struct {
	Completed   bool
	SubmittedAt *string
	Status      *string
	Answers     map[string]any
}

type applicationSeed struct {
	ID          string
	Beneficiary string
	Status      string
	Stage       string
	AssignedTo  *string
	AgingDays   int
	CreatedAt   string
	Scores      scoreSeed
	Flags       flagSeed
	Documents   []documentSeed
	Visits      []visitSeed
	Timeline    []timelineSeed
	Survey      *surveySeed
}

var applicationSeeds = []applicationSeed{
	{
		ID:          "APP-2025-0001",
		Beneficiary: "11111111-1111-1111-1111-111111111111",
		Status:      "DESK_REVIEW",
		Stage:       "KYC",
		AssignedTo:  strPtr(operatorTkskID),
		AgingDays:   2,
		CreatedAt:   "2025-10-18T08:30:00Z",
		Scores:      scoreSeed{OCR: 0.92, Face: 0.88, Liveness: "OK"},
		Flags:       flagSeed{Similarity: 0.82},
		Documents: []documentSeed{
			{ID: "APP-2025-0001-KTP", Type: "KTP", URL: "/mock/ktp1.jpg", Hash: "APP-2025-0001-ktp"},
			{ID: "APP-2025-0001-SELFIE", Type: "SELFIE", URL: "/mock/selfie1.jpg", Hash: "APP-2025-0001-selfie"},
		},
		Timeline: []timelineSeed{
			{At: "2025-10-18T08:30:00Z", By: "system", Action: "SUBMITTED"},
			{At: "2025-10-18T08:31:00Z", By: "scoring", Action: "SCORED"},
			{At: "2025-10-19T09:15:00Z", By: operatorAdminID, Action: "DESK_REVIEW_STARTED"},
		},
		Survey: &surveySeed{Completed: false, Status: strPtr("belum-dikumpulkan")},
	},
	{
		ID:          "APP-2025-0002",
		Beneficiary: "22222222-2222-2222-2222-222222222222",
		Status:      "FIELD_VISIT",
		Stage:       "FIELD",
		AssignedTo:  strPtr(operatorTkskID),
		AgingDays:   4,
		CreatedAt:   "2025-10-15T07:10:00Z",
		Scores:      scoreSeed{OCR: 0.90, Face: 0.81, Liveness: "OK"},
		Flags: flagSeed{
			DuplicateFace: true,
			Similarity:    0.89,
			Candidates:    []map[string]any{{"id": "APP-2024-8890", "name": "Rahmad Hidayat", "similarity": 0.78}},
		},
		Documents: []documentSeed{
			{ID: "APP-2025-0002-KTP", Type: "KTP", URL: "/mock/ktp1.jpg", Hash: "APP-2025-0002-ktp"},
			{ID: "APP-2025-0002-SELFIE", Type: "SELFIE", URL: "/mock/selfie1.jpg", Hash: "APP-2025-0002-selfie"},
		},
		Visits: []visitSeed{{ID: "VST-4001", ScheduledAt: "2025-10-20T03:00:00Z", Status: "IN_PROGRESS", TkskID: operatorTkskID}},
		Timeline: []timelineSeed{
			{At: "2025-10-15T07:10:00Z", By: "system", Action: "SUBMITTED"},
			{At: "2025-10-15T07:12:00Z", By: "scoring", Action: "SCORED"},
			{At: "2025-10-18T06:20:00Z", By: operatorAdminID, Action: "FIELD_VISIT_REQUESTED"},
			{At: "2025-10-20T02:55:00Z", By: operatorTkskID, Action: "VISIT:IN_PROGRESS"},
		},
		Survey: &surveySeed{
			Completed:   true,
			Status:      strPtr("disetujui"),
			SubmittedAt: strPtr("2025-10-19T08:45:00Z"),
			Answers: map[string]any{
				"partB": map[string]any{
					"householdMembers": 3,
					"schoolChildren":   "Ada (1 SD)",
					"toddlers":         "Tidak ada",
					"elderly":          "Ada (1 lansia)",
					"disability":       "Tidak ada",
				},
			},
		},
	},
	{
		ID:          "APP-2025-0003",
		Beneficiary: "33333333-3333-3333-3333-333333333333",
		Status:      "FINAL_APPROVED",
		Stage:       "DISBURSEMENT",
		AssignedTo:  strPtr(operatorTkskID),
		AgingDays:   7,
		CreatedAt:   "2025-10-10T05:30:00Z",
		Scores:      scoreSeed{OCR: 0.95, Face: 0.90, Liveness: "OK"},
		Flags:       flagSeed{Similarity: 0.91},
		Documents: []documentSeed{
			{ID: "APP-2025-0003-KTP", Type: "KTP", URL: "/mock/ktp1.jpg", Hash: "APP-2025-0003-ktp"},
			{ID: "APP-2025-0003-SELFIE", Type: "SELFIE", URL: "/mock/selfie1.jpg", Hash: "APP-2025-0003-selfie"},
		},
		Visits: []visitSeed{{ID: "VST-4002", ScheduledAt: "2025-10-12T02:00:00Z", Status: "SUBMITTED", TkskID: operatorTkskID}},
		Timeline: []timelineSeed{
			{At: "2025-10-10T05:30:00Z", By: "system", Action: "SUBMITTED"},
			{At: "2025-10-10T05:31:00Z", By: "scoring", Action: "SCORED"},
			{At: "2025-10-12T06:00:00Z", By: operatorTkskID, Action: "VISIT:SUBMITTED"},
			{At: "2025-10-13T04:10:00Z", By: operatorAdminID, Action: "STATUS:FINAL_APPROVED"},
		},
		Survey: &surveySeed{
			Completed:   true,
			Status:      strPtr("diperiksa"),
			SubmittedAt: strPtr("2025-10-11T09:20:00Z"),
			Answers: map[string]any{
				"partB": map[string]any{"householdMembers": 5, "schoolChildren": "Ada (2 SD)", "toddlers": "Ada (1 balita)", "elderly": "Tidak ada", "disability": "Tidak ada"},
			},
		},
	},
	{
		ID:          "APP-2025-0004",
		Beneficiary: "44444444-4444-4444-4444-444444444444",
		Status:      "RETURNED_FOR_REVISION",
		Stage:       "KYC",
		AgingDays:   6,
		CreatedAt:   "2025-10-12T09:00:00Z",
		Scores:      scoreSeed{OCR: 0.85, Face: 0.79, Liveness: "OK"},
		Flags:       flagSeed{Similarity: 0.76},
		Documents: []documentSeed{
			{ID: "APP-2025-0004-KTP", Type: "KTP", URL: "/mock/ktp1.jpg", Hash: "APP-2025-0004-ktp"},
			{ID: "APP-2025-0004-SELFIE", Type: "SELFIE", URL: "/mock/selfie1.jpg", Hash: "APP-2025-0004-selfie"},
		},
		Timeline: []timelineSeed{
			{At: "2025-10-12T09:00:00Z", By: "system", Action: "SUBMITTED"},
			{At: "2025-10-12T09:02:00Z", By: "scoring", Action: "SCORED"},
			{At: "2025-10-16T02:40:00Z", By: operatorAdminID, Action: "STATUS:RETURNED_FOR_REVISION", Reason: strPtr("Perlu dokumen KK terbaru")},
		},
		Survey: &surveySeed{Completed: false, Status: strPtr("antrean"), SubmittedAt: strPtr("2025-10-16T04:00:00Z")},
	},
}

type operatorSeed struct {
	ID          string
	Name        string
	Role        string
	NIK         string
	Phone       string
	Email       string
	PIN         string
	Region      regionSeed
	RegionScope []string
}

var operatorSeeds = []operatorSeed{
	{
		ID:          operatorAdminID,
		Name:        "Admin Dinsos",
		Role:        "ADMIN",
		NIK:         "3171010000000001",
		Phone:       "081100000001",
		Email:       "admin@dinsos.local",
		PIN:         "111111",
		Region:      regionSeed{"Kepri", "Batam", "Batam Kota", "Belian"},
		RegionScope: []string{"Batam"},
	},
	{
		ID:          operatorTkskID,
		Name:        "Budi (TKSK Sekupang)",
		Role:        "TKSK",
		NIK:         "3171010000000003",
		Phone:       "081100000003",
		Email:       "budi.tksk@dinsos.local",
		PIN:         "333333",
		Region:      regionSeed{"Kepri", "Batam", "Sekupang", "Tg Riau"},
		RegionScope: []string{"Sekupang"},
	},
	{
		ID:          operatorAudID,
		Name:        "Inspektorat",
		Role:        "AUDITOR",
		NIK:         "3171010000000004",
		Phone:       "081100000004",
		Email:       "inspektorat@dinsos.local",
		PIN:         "444444",
		Region:      regionSeed{"Kepri", "Batam", "Batam Kota", "Belian"},
		RegionScope: []string{"Batam"},
	},
}

type configSeed struct {
	Period     string
	Thresholds map[string]any
	Features   map[string]any
}

var cfgSeed = configSeed{
	Period:     "2025-Q4",
	Thresholds: map[string]any{"ocr_min": 0.8, "face_min": 0.8},
	Features:   map[string]any{"enableAppeal": true, "enableOfflineTKSK": true},
}

type distributionSeed struct {
	ID              string
	Name            string
	ScheduledAt     string
	Channel         string
	Location        string
	Status          string
	Notes           *string
	CreatedBy       string
	CreatedAt       string
	UpdatedBy       string
	UpdatedAt       string
	BatchCodes      []string
	UserIDs         []string
	NotifiedUserIDs []string
}

var distributionSeeds = []distributionSeed{
	{
		ID:              "DIST-001",
		Name:            "Penyaluran PKH Sekupang",
		ScheduledAt:     "2025-10-25T02:00:00Z",
		Channel:         "BANK_TRANSFER",
		Location:        "Kecamatan Sekupang",
		Status:          "PLANNED",
		Notes:           strPtr("Utamakan lansia dan keluarga dengan balita."),
		CreatedBy:       operatorAdminID,
		CreatedAt:       "2025-10-18T10:00:00Z",
		UpdatedBy:       operatorAdminID,
		UpdatedAt:       "2025-10-18T10:00:00Z",
		BatchCodes:      []string{"BAT-2025Q4-001"},
		UserIDs:         []string{"33333333-3333-3333-3333-333333333333"},
		NotifiedUserIDs: []string{},
	},
}

type clusteringRunSeed struct {
	ID         string
	Operator   string
	StartedAt  string
	FinishedAt string
	Parameters map[string]any
	Summary    map[string]any
}

var runSeed = clusteringRunSeed{
	ID:         "CLUST-SEED",
	Operator:   "seed",
	StartedAt:  "2025-10-18T06:00:00Z",
	FinishedAt: "2025-10-18T06:00:05Z",
	Parameters: map[string]any{"dataset": "2025-Q4-Seeding", "window": "Rolling 90 hari", "algorithm": "k-means-v2"},
	Summary:    map[string]any{"total": 4, "tinggi": 2, "sedang": 2, "rendah": 0},
}

type clusteringCandidateSeed struct {
	UserID     string
	RunID      string
	Status     string
	AssignedTo *string
	Reviewer   *string
	ReviewedAt *string
	Notes      *string
}

var candidateSeeds = []clusteringCandidateSeed{
	{UserID: "11111111-1111-1111-1111-111111111111", RunID: "CLUST-SEED", Status: "IN_REVIEW", AssignedTo: strPtr(operatorTkskID)},
	{UserID: "22222222-2222-2222-2222-222222222222", RunID: "CLUST-SEED", Status: "IN_REVIEW", AssignedTo: strPtr(operatorTkskID)},
	{UserID: "33333333-3333-3333-3333-333333333333", RunID: "CLUST-SEED", Status: "APPROVED", Reviewer: strPtr(operatorTkskID), ReviewedAt: strPtr("2025-10-13T04:00:00Z"), Notes: strPtr("Telah diverifikasi lapangan")},
	{UserID: "44444444-4444-4444-4444-444444444444", RunID: "CLUST-SEED", Status: "PENDING_REVIEW"},
}

func seedBeneficiaries(ctx context.Context, tx pgx.Tx) error {
	for _, b := range beneficiaries {
		if _, err := tx.Exec(ctx, `
            INSERT INTO beneficiaries (user_id, household_size, cluster_category, cluster_priority, portal_flags)
            VALUES ($1,$2,$3,$4,$5::jsonb)
            ON CONFLICT (user_id) DO UPDATE SET
                household_size = EXCLUDED.household_size,
                cluster_category = EXCLUDED.cluster_category,
                cluster_priority = EXCLUDED.cluster_priority,
                portal_flags = EXCLUDED.portal_flags`,
			b.ID, b.HouseholdSize, b.ClusterCategory, b.ClusterPriority,
			mustJSON(map[string]any{
				"verificationStatus": b.Portal.VerificationStatus,
				"faceMatchPassed":    b.Portal.FaceMatchPassed,
				"livenessPassed":     b.Portal.LivenessPassed,
				"email":              b.Portal.Email,
			}),
		); err != nil {
			return fmt.Errorf("seed beneficiary profile %s: %w", b.ID, err)
		}
	}
	return nil
}

func seedUsers(ctx context.Context, tx pgx.Tx) error {
	for _, u := range operatorSeeds {
		if _, err := tx.Exec(ctx, `
            INSERT INTO users (
                id, role, nik, name, phone, email, pin_hash,
                region_prov, region_kab, region_kec, region_kel,
                region_scope, metadata)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)
            ON CONFLICT (id) DO UPDATE
            SET role = EXCLUDED.role,
                nik = EXCLUDED.nik,
                name = EXCLUDED.name,
                phone = EXCLUDED.phone,
                email = EXCLUDED.email,
                pin_hash = EXCLUDED.pin_hash,
                region_prov = EXCLUDED.region_prov,
                region_kab = EXCLUDED.region_kab,
                region_kec = EXCLUDED.region_kec,
                region_kel = EXCLUDED.region_kel,
                region_scope = EXCLUDED.region_scope,
                metadata = EXCLUDED.metadata,
                updated_at = NOW()`,
			u.ID, u.Role, u.NIK, u.Name, u.Phone, u.Email, hashPIN(u.PIN),
			u.Region.Prov, u.Region.Kab, u.Region.Kec, u.Region.Kel,
			u.RegionScope, mustJSON(map[string]any{"type": "operator"}),
		); err != nil {
			return fmt.Errorf("seed operator user %s: %w", u.ID, err)
		}
	}

	for _, b := range beneficiaries {
		dob, err := time.Parse("2006-01-02", b.DOB)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `
            INSERT INTO users (
                id, role, nik, name, dob, phone, email, pin_hash,
                region_prov, region_kab, region_kec, region_kel,
                region_scope, metadata)
            VALUES ($1,'BENEFICIARY',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)
            ON CONFLICT (id) DO UPDATE
            SET nik = EXCLUDED.nik,
                name = EXCLUDED.name,
                dob = EXCLUDED.dob,
                phone = EXCLUDED.phone,
                email = EXCLUDED.email,
                pin_hash = EXCLUDED.pin_hash,
                region_prov = EXCLUDED.region_prov,
                region_kab = EXCLUDED.region_kab,
                region_kec = EXCLUDED.region_kec,
                region_kel = EXCLUDED.region_kel,
                region_scope = EXCLUDED.region_scope,
                metadata = EXCLUDED.metadata,
                updated_at = NOW()`,
			b.ID, b.Nik, b.Name, dob, b.Phone, b.Email, hashPIN(b.Portal.PIN),
			b.Region.Prov, b.Region.Kab, b.Region.Kec, b.Region.Kel,
			[]string{b.Region.Kab},
			mustJSON(map[string]any{"verificationStatus": b.Portal.VerificationStatus}),
		); err != nil {
			return fmt.Errorf("seed beneficiary user %s: %w", b.ID, err)
		}
	}
	return nil
}

func seedConfig(ctx context.Context, tx pgx.Tx) error {
	if _, err := tx.Exec(ctx, `
        INSERT INTO system_config (id, period, thresholds, features)
        VALUES (1, $1, $2::jsonb, $3::jsonb)
        ON CONFLICT (id) DO UPDATE
        SET period = EXCLUDED.period,
            thresholds = EXCLUDED.thresholds,
            features = EXCLUDED.features,
            updated_at = NOW()`,
		cfgSeed.Period, mustJSON(cfgSeed.Thresholds), mustJSON(cfgSeed.Features),
	); err != nil {
		return fmt.Errorf("seed config: %w", err)
	}
	return nil
}

func seedApplications(ctx context.Context, tx pgx.Tx) error {
	beneMap := make(map[string]beneficiarySeed, len(beneficiaries))
	for _, b := range beneficiaries {
		beneMap[b.ID] = b
	}

	for _, app := range applicationSeeds {
		bene, ok := beneMap[app.Beneficiary]
		if !ok {
			return fmt.Errorf("application %s missing beneficiary", app.ID)
		}
		dob, err := time.Parse("2006-01-02", bene.DOB)
		if err != nil {
			return err
		}
		createdAt, err := time.Parse(time.RFC3339, app.CreatedAt)
		if err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `
            INSERT INTO applications (
                id, beneficiary_user_id, applicant_name, applicant_nik_mask, applicant_dob,
                applicant_phone_mask, status, stage, assigned_to, aging_days,
                score_ocr, score_face, score_liveness, flags, created_at, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$15)
            ON CONFLICT (id) DO UPDATE SET
                beneficiary_user_id = EXCLUDED.beneficiary_user_id,
                applicant_name = EXCLUDED.applicant_name,
                applicant_nik_mask = EXCLUDED.applicant_nik_mask,
                applicant_dob = EXCLUDED.applicant_dob,
                applicant_phone_mask = EXCLUDED.applicant_phone_mask,
                status = EXCLUDED.status,
                stage = EXCLUDED.stage,
                assigned_to = EXCLUDED.assigned_to,
                aging_days = EXCLUDED.aging_days,
                score_ocr = EXCLUDED.score_ocr,
                score_face = EXCLUDED.score_face,
                score_liveness = EXCLUDED.score_liveness,
                flags = EXCLUDED.flags,
                updated_at = NOW()`,
			app.ID, bene.ID, bene.Name, maskNik(bene.Nik), dob, maskPhone(bene.Phone),
			app.Status, app.Stage, app.AssignedTo, app.AgingDays,
			app.Scores.OCR, app.Scores.Face, app.Scores.Liveness,
			mustJSON(map[string]any{
				"duplicate_nik":  app.Flags.DuplicateNik,
				"duplicate_face": app.Flags.DuplicateFace,
				"device_anomaly": app.Flags.DeviceAnomaly,
				"similarity":     app.Flags.Similarity,
				"candidates":     app.Flags.Candidates,
			}), createdAt,
		)
		if err != nil {
			return fmt.Errorf("seed application %s: %w", app.ID, err)
		}

		if _, err := tx.Exec(ctx, `DELETE FROM application_documents WHERE application_id=$1`, app.ID); err != nil {
			return err
		}
		for _, doc := range app.Documents {
			if _, err := tx.Exec(ctx, `
                INSERT INTO application_documents (id, application_id, doc_type, url, sha256)
                VALUES ($1,$2,$3,$4,$5)
                ON CONFLICT (id) DO UPDATE SET
                    doc_type = EXCLUDED.doc_type,
                    url = EXCLUDED.url,
                    sha256 = EXCLUDED.sha256`,
				doc.ID, app.ID, doc.Type, doc.URL, doc.Hash,
			); err != nil {
				return err
			}
		}

		if _, err := tx.Exec(ctx, `DELETE FROM application_visits WHERE application_id=$1`, app.ID); err != nil {
			return err
		}
		for _, visit := range app.Visits {
			scheduledAt, err := time.Parse(time.RFC3339, visit.ScheduledAt)
			if err != nil {
				return err
			}
			if _, err := tx.Exec(ctx, `
                INSERT INTO application_visits (id, application_id, scheduled_at, status, tksk_id)
                VALUES ($1,$2,$3,$4,$5)
                ON CONFLICT (id) DO UPDATE SET
                    scheduled_at = EXCLUDED.scheduled_at,
                    status = EXCLUDED.status,
                    tksk_id = EXCLUDED.tksk_id`,
				visit.ID, app.ID, scheduledAt, visit.Status, visit.TkskID,
			); err != nil {
				return err
			}
		}

		if _, err := tx.Exec(ctx, `DELETE FROM application_timeline WHERE application_id=$1`, app.ID); err != nil {
			return err
		}
		for _, entry := range app.Timeline {
			at, err := time.Parse(time.RFC3339, entry.At)
			if err != nil {
				return err
			}
			if _, err := tx.Exec(ctx, `
                INSERT INTO application_timeline (application_id, occurred_at, actor, action, reason)
                VALUES ($1,$2,$3,$4,$5)`,
				app.ID, at, entry.By, entry.Action, entry.Reason,
			); err != nil {
				return err
			}
		}

		if app.Survey != nil {
			var submitted *time.Time
			if app.Survey.SubmittedAt != nil {
				t, err := time.Parse(time.RFC3339, *app.Survey.SubmittedAt)
				if err != nil {
					return err
				}
				submitted = &t
			}
			if _, err := tx.Exec(ctx, `
                INSERT INTO survey_responses (application_id, completed, submitted_at, status, answers)
                VALUES ($1,$2,$3,$4,$5::jsonb)
                ON CONFLICT (application_id) DO UPDATE SET
                    completed = EXCLUDED.completed,
                    submitted_at = EXCLUDED.submitted_at,
                    status = EXCLUDED.status,
                    answers = EXCLUDED.answers`,
				app.ID, app.Survey.Completed, submitted, app.Survey.Status, mustJSON(app.Survey.Answers),
			); err != nil {
				return err
			}
		}
	}
	return nil
}

func seedBatches(ctx context.Context, tx pgx.Tx) error {
	if _, err := tx.Exec(ctx, `
        INSERT INTO batches (id, code, status, checksum)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (id) DO UPDATE SET
            code=EXCLUDED.code,
            status=EXCLUDED.status,
            checksum=EXCLUDED.checksum`,
		"BATCH-001", "BAT-2025Q4-001", "DRAFT", "mock-checksum",
	); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `DELETE FROM batch_items WHERE batch_id=$1`, "BATCH-001"); err != nil {
		return err
	}
	items := []string{"APP-2025-0002", "APP-2025-0003"}
	for _, appID := range items {
		if _, err := tx.Exec(ctx, `INSERT INTO batch_items (batch_id, application_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, "BATCH-001", appID); err != nil {
			return err
		}
	}
	return nil
}

func seedDistributions(ctx context.Context, tx pgx.Tx) error {
	for _, dist := range distributionSeeds {
		scheduledAt, err := time.Parse(time.RFC3339, dist.ScheduledAt)
		if err != nil {
			return err
		}
		createdAt, err := time.Parse(time.RFC3339, dist.CreatedAt)
		if err != nil {
			return err
		}
		updatedAt, err := time.Parse(time.RFC3339, dist.UpdatedAt)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `
            INSERT INTO distributions (id, name, scheduled_at, channel, location, status, notes, created_by, created_at, updated_by, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            ON CONFLICT (id) DO UPDATE SET
                name=EXCLUDED.name,
                scheduled_at=EXCLUDED.scheduled_at,
                channel=EXCLUDED.channel,
                location=EXCLUDED.location,
                status=EXCLUDED.status,
                notes=EXCLUDED.notes,
                created_by=EXCLUDED.created_by,
                created_at=EXCLUDED.created_at,
                updated_by=EXCLUDED.updated_by,
                updated_at=EXCLUDED.updated_at`,
			dist.ID, dist.Name, scheduledAt, dist.Channel, dist.Location, dist.Status, dist.Notes, dist.CreatedBy, createdAt, dist.UpdatedBy, updatedAt,
		); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `DELETE FROM distribution_batches WHERE distribution_id=$1`, dist.ID); err != nil {
			return err
		}
		for _, code := range dist.BatchCodes {
			if _, err := tx.Exec(ctx, `INSERT INTO distribution_batches (distribution_id, batch_code) VALUES ($1,$2) ON CONFLICT DO NOTHING`, dist.ID, code); err != nil {
				return err
			}
		}
		if _, err := tx.Exec(ctx, `DELETE FROM distribution_beneficiaries WHERE distribution_id=$1`, dist.ID); err != nil {
			return err
		}
		for _, userID := range dist.UserIDs {
			if _, err := tx.Exec(ctx, `INSERT INTO distribution_beneficiaries (distribution_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, dist.ID, userID); err != nil {
				return err
			}
		}
		if _, err := tx.Exec(ctx, `DELETE FROM distribution_notified WHERE distribution_id=$1`, dist.ID); err != nil {
			return err
		}
		for _, userID := range dist.NotifiedUserIDs {
			if _, err := tx.Exec(ctx, `INSERT INTO distribution_notified (distribution_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, dist.ID, userID); err != nil {
				return err
			}
		}
	}
	return nil
}

func seedClustering(ctx context.Context, tx pgx.Tx) error {
	startedAt, err := time.Parse(time.RFC3339, runSeed.StartedAt)
	if err != nil {
		return err
	}
	finishedAt, err := time.Parse(time.RFC3339, runSeed.FinishedAt)
	if err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
        INSERT INTO clustering_runs (id, operator, started_at, finished_at, parameters, summary)
        VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb)
        ON CONFLICT (id) DO UPDATE SET
            operator=EXCLUDED.operator,
            started_at=EXCLUDED.started_at,
            finished_at=EXCLUDED.finished_at,
            parameters=EXCLUDED.parameters,
            summary=EXCLUDED.summary`,
		runSeed.ID, runSeed.Operator, startedAt, finishedAt, mustJSON(runSeed.Parameters), mustJSON(runSeed.Summary),
	); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, `DELETE FROM clustering_candidates WHERE run_id=$1`, runSeed.ID); err != nil {
		return err
	}

	beneMap := make(map[string]beneficiarySeed)
	for _, b := range beneficiaries {
		beneMap[b.ID] = b
	}

	for _, candidate := range candidateSeeds {
		bene := beneMap[candidate.UserID]
		var reviewedAt *time.Time
		if candidate.ReviewedAt != nil {
			t, err := time.Parse(time.RFC3339, *candidate.ReviewedAt)
			if err != nil {
				return err
			}
			reviewedAt = &t
		}
		if _, err := tx.Exec(ctx, `
            INSERT INTO clustering_candidates (
                id, run_id, user_id, region, cluster, priority, score, household_size,
                status, assigned_to, reviewer, reviewed_at, notes)
            VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            ON CONFLICT (id) DO UPDATE SET
                run_id = EXCLUDED.run_id,
                user_id = EXCLUDED.user_id,
                region = EXCLUDED.region,
                cluster = EXCLUDED.cluster,
                priority = EXCLUDED.priority,
                score = EXCLUDED.score,
                household_size = EXCLUDED.household_size,
                status = EXCLUDED.status,
                assigned_to = EXCLUDED.assigned_to,
                reviewer = EXCLUDED.reviewer,
                reviewed_at = EXCLUDED.reviewed_at,
                notes = EXCLUDED.notes`,
			candidate.UserID, candidate.RunID, candidate.UserID,
			mustJSON(map[string]string{"prov": bene.Region.Prov, "kab": bene.Region.Kab, "kec": bene.Region.Kec, "kel": bene.Region.Kel}),
			bene.ClusterCategory, bene.ClusterPriority, priorityScore(bene.ClusterPriority), bene.HouseholdSize,
			candidate.Status, candidate.AssignedTo, candidate.Reviewer, reviewedAt, candidate.Notes,
		); err != nil {
			return err
		}
	}
	return nil
}

func hashPIN(pin string) string {
	return fmt.Sprintf("plain:%s", pin)
}

func maskNik(nik string) string {
	return maskDigits(nik, 4)
}

func maskPhone(phone string) string {
	return maskDigits(phone, 4)
}

func maskDigits(value string, visible int) string {
	if len(value) <= visible {
		return value
	}
	hidden := strings.Repeat("*", len(value)-visible)
	return hidden + value[len(value)-visible:]
}

func strPtr(v string) *string { return &v }

func mustJSON(value any) []byte {
	if value == nil {
		return nil
	}
	b, err := json.Marshal(value)
	if err != nil {
		panic(err)
	}
	return b
}

func priorityScore(priority string) float64 {
	switch strings.ToUpper(priority) {
	case "TINGGI":
		return 0.9
	case "SEDANG":
		return 0.7
	default:
		return 0.5
	}
}
