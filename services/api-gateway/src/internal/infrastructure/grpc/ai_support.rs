use anyhow::anyhow;
use async_trait::async_trait;
use tonic::transport::{Channel, Endpoint};
use tonic::{Code, Request, Status};

use crate::internal::domain::entities::ekyc::{
    AsyncJobHandle, BinaryImage, StartFaceMatchJobPayload, StartLivenessJobPayload,
};
use crate::internal::domain::services::AiSupportPort;
use crate::internal::infrastructure::grpc::pb::{
    self, ekyc_support_service_client::EkycSupportServiceClient,
};
use crate::pkg::types::error::{AppError, AppResult};

#[derive(Clone)]
pub struct AiSupportClient {
    target: String,
}

impl AiSupportClient {
    pub fn new(target: &str) -> AppResult<Self> {
        let normalized = normalize_target(target)?;
        Ok(Self { target: normalized })
    }

    fn client(&self) -> AppResult<EkycSupportServiceClient<Channel>> {
        let endpoint =
            Endpoint::from_shared(self.target.clone()).map_err(|e| AppError::Internal(e.into()))?;
        Ok(EkycSupportServiceClient::new(endpoint.connect_lazy()))
    }
}

fn normalize_target(target: &str) -> AppResult<String> {
    if target.starts_with("http://") || target.starts_with("https://") {
        return Ok(target.to_string());
    }
    Ok(format!("http://{target}"))
}

#[async_trait]
impl AiSupportPort for AiSupportClient {
    async fn start_face_match_job(
        &self,
        payload: StartFaceMatchJobPayload,
    ) -> AppResult<AsyncJobHandle> {
        let mut client = self.client()?;
        let request = pb::StartFaceMatchRequest {
            session_id: payload.session_id,
            ktp_image: Some(to_proto_image(payload.ktp_image)),
            selfie_image: Some(to_proto_image(payload.selfie_image)),
            face_match_threshold: payload.face_match_threshold,
        };

        let response = client
            .start_face_match_job(Request::new(request))
            .await
            .map_err(map_status)?
            .into_inner();

        let job = response.job.unwrap_or_default();

        Ok(map_face_job(job))
    }

    async fn start_liveness_job(
        &self,
        payload: StartLivenessJobPayload,
    ) -> AppResult<AsyncJobHandle> {
        let mut client = self.client()?;
        let request = pb::StartLivenessRequest {
            session_id: payload.session_id,
            liveness_frames: payload
                .liveness_frames
                .into_iter()
                .map(to_proto_image)
                .collect(),
            gestures: payload.gestures,
        };

        let response = client
            .start_liveness_job(Request::new(request))
            .await
            .map_err(map_status)?
            .into_inner();

        let job = response.job.unwrap_or_default();

        Ok(map_liveness_job(job))
    }
}

fn map_status(status: Status) -> AppError {
    match status.code() {
        Code::InvalidArgument => AppError::BadRequest(status.message().to_string()),
        _ => AppError::Internal(anyhow!("ai support gRPC error: {status}")),
    }
}

fn map_face_job(job: pb::FaceMatchJobHandle) -> AsyncJobHandle {
    AsyncJobHandle {
        job_id: job.job_id,
        queue: job.queue,
    }
}

fn map_liveness_job(job: pb::LivenessJobHandle) -> AsyncJobHandle {
    AsyncJobHandle {
        job_id: job.job_id,
        queue: job.queue,
    }
}

fn to_proto_image(image: BinaryImage) -> pb::ImagePayload {
    pb::ImagePayload {
        content: image.content,
        mime_type: image.mime_type.unwrap_or_default(),
    }
}
