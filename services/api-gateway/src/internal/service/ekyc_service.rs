use crate::internal::domain::entities::ekyc::{
    EkycAsyncResponse, KtpOcrResultData, PerformOcrPayload, ProcessEkycPayload,
    StartFaceMatchJobPayload, StartLivenessJobPayload,
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
        let ProcessEkycPayload {
            session_id,
            ktp_image,
            selfie_image,
            liveness_frames,
            gestures,
            face_match_threshold,
            locale,
        } = payload;

        let ocr_result = self
            .ai_port
            .perform_ktp_ocr(PerformOcrPayload {
                image: ktp_image.clone(),
                locale: locale.clone(),
            })
            .await?;

        let face_match_job = self
            .ai_port
            .start_face_match_job(StartFaceMatchJobPayload {
                session_id: session_id.clone(),
                ktp_image,
                selfie_image,
                face_match_threshold: face_match_threshold.unwrap_or_default(),
            })
            .await?;

        let liveness_job = self
            .ai_port
            .start_liveness_job(StartLivenessJobPayload {
                session_id,
                liveness_frames,
                gestures,
            })
            .await?;

        Ok(EkycAsyncResponse {
            ocr_result,
            face_match_job,
            liveness_job,
        })
    }
}
