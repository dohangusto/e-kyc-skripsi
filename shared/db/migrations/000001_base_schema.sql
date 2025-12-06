CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL,
    nik TEXT UNIQUE,
    name TEXT NOT NULL,
    dob DATE,
    phone TEXT,
    email TEXT,
    pin_hash TEXT,
    region_prov TEXT,
    region_kab TEXT,
    region_kec TEXT,
    region_kel TEXT,
    region_scope TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

CREATE TABLE IF NOT EXISTS beneficiaries (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bansos_utama TEXT,
    ranking_bansos_utama INT,
    bansos_pendukung TEXT,
    ranking_bansos_pendukung INT,
    portal_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_config (
    id INTEGER PRIMARY KEY,
    period TEXT NOT NULL,
    thresholds JSONB NOT NULL DEFAULT '{}'::jsonb,
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    beneficiary_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    applicant_name TEXT NOT NULL,
    applicant_nik_mask TEXT,
    applicant_dob DATE,
    applicant_phone_mask TEXT,
    status TEXT NOT NULL,
    stage TEXT NOT NULL,
    assigned_to UUID REFERENCES users(id),
    aging_days INT NOT NULL DEFAULT 0,
    score_ocr DOUBLE PRECISION NOT NULL DEFAULT 0,
    score_face DOUBLE PRECISION NOT NULL DEFAULT 0,
    score_liveness TEXT NOT NULL DEFAULT '',
    flags JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_beneficiary ON applications(beneficiary_user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

CREATE TABLE IF NOT EXISTS application_documents (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL,
    url TEXT NOT NULL,
    sha256 TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS application_visits (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    geotag_lat DOUBLE PRECISION,
    geotag_lng DOUBLE PRECISION,
    photos JSONB NOT NULL DEFAULT '[]'::jsonb,
    checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL,
    tksk_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_application_visits_app_id ON application_visits(application_id);

CREATE TABLE IF NOT EXISTS application_timeline (
    id BIGSERIAL PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS survey_responses (
    application_id TEXT PRIMARY KEY REFERENCES applications(id) ON DELETE CASCADE,
    beneficiary_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    submitted_at TIMESTAMPTZ,
    status TEXT,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
    batch_code TEXT NOT NULL REFERENCES batches(code) ON DELETE CASCADE,
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
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    summary JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS clustering_candidates (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES clustering_runs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    region JSONB NOT NULL DEFAULT '{}'::jsonb,
    cluster TEXT NOT NULL,
    priority TEXT NOT NULL,
    score DOUBLE PRECISION NOT NULL DEFAULT 0,
    household_size INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL,
    assigned_to UUID REFERENCES users(id),
    reviewer UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor TEXT NOT NULL,
    entity TEXT NOT NULL,
    action TEXT NOT NULL,
    reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS ekyc_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    face_matching_status TEXT NOT NULL DEFAULT 'NOT_STARTED',
    liveness_status TEXT NOT NULL DEFAULT 'NOT_STARTED',
    final_decision TEXT NOT NULL DEFAULT 'PENDING',
    id_card_url TEXT,
    selfie_with_id_url TEXT,
    recorded_video_url TEXT,
    face_match_overall TEXT,
    liveness_overall TEXT,
    rejection_reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ekyc_sessions_user_id ON ekyc_sessions(user_id);

CREATE TABLE IF NOT EXISTS face_checks (
    id BIGSERIAL PRIMARY KEY,
    ekyc_session_id UUID NOT NULL REFERENCES ekyc_sessions(id) ON DELETE CASCADE,
    step TEXT NOT NULL,
    similarity_score DOUBLE PRECISION,
    threshold DOUBLE PRECISION,
    result TEXT NOT NULL,
    raw_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS liveness_checks (
    id BIGSERIAL PRIMARY KEY,
    ekyc_session_id UUID NOT NULL REFERENCES ekyc_sessions(id) ON DELETE CASCADE,
    overall_result TEXT NOT NULL,
    per_gesture_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    recorded_video_url TEXT,
    raw_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
