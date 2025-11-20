CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DROP TABLE IF EXISTS distribution_notified CASCADE;
DROP TABLE IF EXISTS distribution_beneficiaries CASCADE;
DROP TABLE IF EXISTS distribution_batches CASCADE;
DROP TABLE IF EXISTS distributions CASCADE;
DROP TABLE IF EXISTS batch_items CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS survey_responses CASCADE;
DROP TABLE IF EXISTS application_timeline CASCADE;
DROP TABLE IF EXISTS application_visits CASCADE;
DROP TABLE IF EXISTS application_documents CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS clustering_candidates CASCADE;
DROP TABLE IF EXISTS clustering_runs CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS system_config CASCADE;
DROP TABLE IF EXISTS beneficiary_notifications CASCADE;
DROP TABLE IF EXISTS beneficiaries CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL,
    nik TEXT,
    name TEXT NOT NULL,
    dob DATE,
    phone TEXT,
    email TEXT,
    pin_hash TEXT,
    last_login TIMESTAMPTZ,
    region_prov TEXT,
    region_kab TEXT,
    region_kec TEXT,
    region_kel TEXT,
    region_scope TEXT[] NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nik ON users(nik) WHERE nik IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS beneficiaries (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    household_size INTEGER NOT NULL DEFAULT 1,
    cluster_category TEXT,
    cluster_priority TEXT,
    portal_flags JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS beneficiary_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    payload JSONB NOT NULL,
    scheduled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    beneficiary_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    applicant_name TEXT NOT NULL,
    applicant_nik_mask TEXT NOT NULL,
    applicant_dob DATE NOT NULL,
    applicant_phone_mask TEXT,
    status TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'KYC',
    assigned_to UUID REFERENCES users(id),
    aging_days INTEGER NOT NULL DEFAULT 0,
    score_ocr NUMERIC(5,2) NOT NULL DEFAULT 0,
    score_face NUMERIC(5,2) NOT NULL DEFAULT 0,
    score_liveness TEXT NOT NULL DEFAULT 'UNKNOWN',
    flags JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS application_documents (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL,
    url TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS application_visits (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    geotag_lat DOUBLE PRECISION,
    geotag_lng DOUBLE PRECISION,
    photos JSONB NOT NULL DEFAULT '[]',
    checklist JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL,
    tksk_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS application_timeline (
    id BIGSERIAL PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    occurred_at TIMESTAMPTZ NOT NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS survey_responses (
    application_id TEXT PRIMARY KEY,
    beneficiary_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    submitted_at TIMESTAMPTZ,
    status TEXT,
    answers JSONB
);

CREATE TABLE IF NOT EXISTS batches (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL,
    checksum TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS batch_items (
    batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    PRIMARY KEY (batch_id, application_id)
);

CREATE TABLE IF NOT EXISTS distributions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    channel TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS distribution_batches (
    distribution_id TEXT NOT NULL REFERENCES distributions(id) ON DELETE CASCADE,
    batch_code TEXT NOT NULL,
    PRIMARY KEY (distribution_id, batch_code)
);

CREATE TABLE IF NOT EXISTS distribution_beneficiaries (
    distribution_id TEXT NOT NULL REFERENCES distributions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (distribution_id, user_id)
);

CREATE TABLE IF NOT EXISTS distribution_notified (
    distribution_id TEXT NOT NULL REFERENCES distributions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (distribution_id, user_id)
);

CREATE TABLE IF NOT EXISTS clustering_runs (
    id TEXT PRIMARY KEY,
    operator TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    parameters JSONB NOT NULL DEFAULT '{}',
    summary JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS clustering_candidates (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES clustering_runs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    region JSONB NOT NULL,
    cluster TEXT NOT NULL,
    priority TEXT NOT NULL,
    score NUMERIC(5,2) NOT NULL,
    household_size INTEGER NOT NULL,
    status TEXT NOT NULL,
    assigned_to UUID REFERENCES users(id),
    reviewer UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    action TEXT NOT NULL,
    reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS system_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    period TEXT NOT NULL,
    thresholds JSONB NOT NULL,
    features JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_beneficiary ON applications(beneficiary_user_id);
CREATE INDEX IF NOT EXISTS idx_visits_application ON application_visits(application_id);
CREATE INDEX IF NOT EXISTS idx_timeline_application ON application_timeline(application_id);
CREATE INDEX IF NOT EXISTS idx_survey_completed ON survey_responses(completed);
CREATE INDEX IF NOT EXISTS idx_survey_beneficiary ON survey_responses(beneficiary_user_id);
CREATE INDEX IF NOT EXISTS idx_distribution_schedule ON distributions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_distribution_user ON distribution_beneficiaries(user_id);
CREATE INDEX IF NOT EXISTS idx_clustering_run ON clustering_candidates(run_id);

CREATE TABLE IF NOT EXISTS ekyc_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    face_matching_status TEXT NOT NULL DEFAULT 'NOT_STARTED',
    liveness_status TEXT NOT NULL DEFAULT 'NOT_STARTED',
    final_decision TEXT NOT NULL DEFAULT 'PENDING',
    id_card_url TEXT,
    selfie_with_id_url TEXT,
    recorded_video_url TEXT,
    face_match_overall TEXT,
    liveness_overall TEXT,
    rejection_reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS face_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ekyc_session_id UUID NOT NULL REFERENCES ekyc_sessions(id) ON DELETE CASCADE,
    step TEXT NOT NULL,
    similarity_score NUMERIC(6,4),
    threshold NUMERIC(6,4),
    result TEXT NOT NULL,
    raw_metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS liveness_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ekyc_session_id UUID NOT NULL REFERENCES ekyc_sessions(id) ON DELETE CASCADE,
    overall_result TEXT NOT NULL,
    per_gesture_result JSONB NOT NULL DEFAULT '{}',
    recorded_video_url TEXT,
    raw_metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ekyc_status ON ekyc_sessions(status, final_decision);
CREATE INDEX IF NOT EXISTS idx_face_checks_session ON face_checks(ekyc_session_id);
CREATE INDEX IF NOT EXISTS idx_liveness_checks_session ON liveness_checks(ekyc_session_id);
