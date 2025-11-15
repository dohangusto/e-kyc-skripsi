use crate::internal::domain::entities::ekyc::{
    EkycAsyncResponse, KtpOcrResultData, PerformOcrPayload, ProcessEkycPayload,
};
use crate::internal::domain::services::AiSupportPort;
use crate::pkg::types::error::AppResult;

pub struct EkycService<P: AiSupportPort> {
    ai_port: P,
}

impl<P: AiSupportPort> EkycService<P> {
    pub fn new(ai_port: P) -> Self {
        Self { ai_port }
    }

    pub async fn perform_ktp_ocr(&self, payload: PerformOcrPayload) -> AppResult<KtpOcrResultData> {
        self.ai_port.perform_ktp_ocr(payload).await
    }

    pub async fn start_async_jobs(
        &self,
        payload: ProcessEkycPayload,
    ) -> AppResult<EkycAsyncResponse> {
        self.ai_port.process_ekyc(payload).await
    }
}
