use async_trait::async_trait;

use crate::internal::domain::entities::ekyc::{
    EkycAsyncResponse, KtpOcrResultData, PerformOcrPayload, ProcessEkycPayload,
};
use crate::pkg::types::error::AppResult;

#[async_trait]
pub trait AiSupportPort: Send + Sync {
    async fn perform_ktp_ocr(&self, payload: PerformOcrPayload) -> AppResult<KtpOcrResultData>;
    async fn process_ekyc(&self, payload: ProcessEkycPayload) -> AppResult<EkycAsyncResponse>;
}
