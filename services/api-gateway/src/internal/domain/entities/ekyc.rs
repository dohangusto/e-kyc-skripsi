#[derive(Clone)]
pub struct BinaryImage {
    pub content: Vec<u8>,
    pub mime_type: Option<String>,
}

#[allow(dead_code)]
pub struct AsyncJobHandle {
    pub job_id: String,
    pub queue: String,
}

pub struct StartFaceMatchJobPayload {
    pub session_id: String,
    pub ktp_image: BinaryImage,
    pub selfie_image: BinaryImage,
    pub face_match_threshold: f64,
}

pub struct StartLivenessJobPayload {
    pub session_id: String,
    pub liveness_frames: Vec<BinaryImage>,
    pub gestures: Vec<String>,
}
