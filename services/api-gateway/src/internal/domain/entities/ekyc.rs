use std::collections::BTreeMap;

#[derive(Debug, Clone)]
pub struct EkycSession {
    pub id: String,
}

#[derive(Debug, Clone)]
pub struct BinaryImage {
    pub content: Vec<u8>,
    pub mime_type: Option<String>,
}

#[derive(Debug, Clone)]
pub struct PerformOcrPayload {
    pub image: BinaryImage,
    pub locale: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ProcessEkycPayload {
    pub session_id: String,
    pub ktp_image: BinaryImage,
    pub selfie_image: BinaryImage,
    pub liveness_frames: Vec<BinaryImage>,
    pub gestures: Vec<String>,
    pub face_match_threshold: Option<f64>,
    pub locale: Option<String>,
}

#[derive(Debug, Clone)]
pub struct StartFaceMatchJobPayload {
    pub session_id: String,
    pub ktp_image: BinaryImage,
    pub selfie_image: BinaryImage,
    pub face_match_threshold: f64,
}

#[derive(Debug, Clone)]
pub struct StartLivenessJobPayload {
    pub session_id: String,
    pub liveness_frames: Vec<BinaryImage>,
    pub gestures: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct AsyncJobHandle {
    pub job_id: String,
    pub queue: String,
}

#[derive(Debug, Clone, Default)]
pub struct KtpOcrResultData {
    pub nik: Option<String>,
    pub name: Option<String>,
    pub birth_place: Option<String>,
    pub birth_date: Option<String>,
    pub gender: Option<String>,
    pub blood_type: Option<String>,
    pub address: Option<String>,
    pub rt_rw: Option<String>,
    pub village: Option<String>,
    pub sub_district: Option<String>,
    pub religion: Option<String>,
    pub marital_status: Option<String>,
    pub occupation: Option<String>,
    pub citizenship: Option<String>,
    pub issue_date: Option<String>,
    pub raw_text: String,
    pub extra_fields: BTreeMap<String, String>,
}

#[derive(Debug, Clone)]
pub struct EkycAsyncResponse {
    pub ocr_result: KtpOcrResultData,
    pub face_match_job: AsyncJobHandle,
    pub liveness_job: AsyncJobHandle,
}
