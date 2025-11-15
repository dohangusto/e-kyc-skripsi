use async_trait::async_trait;

use crate::internal::domain::entities::ekyc::{
    AsyncJobHandle, KtpOcrResultData, PerformOcrPayload, StartFaceMatchJobPayload,
    StartLivenessJobPayload,
};
use crate::pkg::types::error::AppResult;

#[async_trait]
pub trait AiSupportPort: Send + Sync {
    async fn perform_ktp_ocr(&self, payload: PerformOcrPayload) -> AppResult<KtpOcrResultData>;
    async fn start_face_match_job(
        &self,
        payload: StartFaceMatchJobPayload,
    ) -> AppResult<AsyncJobHandle>;
    async fn start_liveness_job(
        &self,
        payload: StartLivenessJobPayload,
    ) -> AppResult<AsyncJobHandle>;
}
