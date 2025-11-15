use std::collections::BTreeMap;

use anyhow::anyhow;
use async_trait::async_trait;
use tonic::transport::{Channel, Endpoint};
use tonic::{Code, Request, Status};

use crate::internal::domain::entities::ekyc::{
    AsyncJobHandle, BinaryImage, EkycAsyncResponse, KtpOcrResultData, PerformOcrPayload,
    ProcessEkycPayload,
};
use crate::internal::domain::services::AiSupportPort;
use crate::internal::infrastructure::grpc::pb::{
    self, ekyc_support_service_client::EkycSupportServiceClient,
};
use crate::pkg::types::error::{AppError, AppResult};

#[derive(Clone)]
pub struct AiSupportClient {
    channel: Channel,
}

impl AiSupportClient {
    pub async fn connect(target: &str) -> AppResult<Self> {
        let endpoint = Endpoint::from_shared(normalize_target(target)?)
            .map_err(|e| AppError::Internal(e.into()))?;
        let channel = endpoint
            .connect()
            .await
            .map_err(|e| AppError::Internal(e.into()))?;
        Ok(Self { channel })
    }

    fn client(&self) -> EkycSupportServiceClient<Channel> {
        EkycSupportServiceClient::new(self.channel.clone())
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
    async fn perform_ktp_ocr(&self, payload: PerformOcrPayload) -> AppResult<KtpOcrResultData> {
        let mut client = self.client();
        let request = pb::KtpOcrRequest {
            image: Some(to_proto_image(payload.image)),
            locale: payload.locale.unwrap_or_default(),
        };

        let response = client
            .perform_ktp_ocr(Request::new(request))
            .await
            .map_err(map_status)?;

        Ok(from_proto_result(response.into_inner().result))
    }

    async fn process_ekyc(&self, payload: ProcessEkycPayload) -> AppResult<EkycAsyncResponse> {
        let mut client = self.client();
        let liveness_frames = payload
            .liveness_frames
            .into_iter()
            .map(to_proto_image)
            .collect();
        let request = pb::EkycRequest {
            session_id: payload.session_id.unwrap_or_default(),
            ktp_image: Some(to_proto_image(payload.ktp_image)),
            selfie_image: Some(to_proto_image(payload.selfie_image)),
            liveness_frames,
            gestures: payload.gestures,
            face_match_threshold: payload.face_match_threshold.unwrap_or_default(),
            locale: payload.locale.unwrap_or_default(),
        };

        let response = client
            .process_ekyc(Request::new(request))
            .await
            .map_err(map_status)?
            .into_inner();

        Ok(EkycAsyncResponse {
            ocr_result: from_proto_result(response.ocr),
            face_match_job: map_job_handle(response.face_match_job),
            liveness_job: map_liveness_handle(response.liveness_job),
        })
    }
}

fn map_status(status: Status) -> AppError {
    match status.code() {
        Code::InvalidArgument => AppError::BadRequest(status.message().to_string()),
        _ => AppError::Internal(anyhow!("ai support gRPC error: {status}")),
    }
}

fn to_proto_image(image: BinaryImage) -> pb::ImagePayload {
    pb::ImagePayload {
        content: image.content,
        mime_type: image.mime_type.unwrap_or_default(),
    }
}

fn from_proto_result(result: Option<pb::KtpOcrResult>) -> KtpOcrResultData {
    if let Some(result) = result {
        let mut extra_fields = BTreeMap::new();
        for field in result.extra_fields {
            extra_fields.insert(field.key, field.value);
        }
        KtpOcrResultData {
            nik: empty_to_none(result.nik),
            name: empty_to_none(result.name),
            birth_place: empty_to_none(result.birth_place),
            birth_date: empty_to_none(result.birth_date),
            gender: empty_to_none(result.gender),
            blood_type: empty_to_none(result.blood_type),
            address: empty_to_none(result.address),
            rt_rw: empty_to_none(result.rt_rw),
            village: empty_to_none(result.village),
            sub_district: empty_to_none(result.sub_district),
            religion: empty_to_none(result.religion),
            marital_status: empty_to_none(result.marital_status),
            occupation: empty_to_none(result.occupation),
            citizenship: empty_to_none(result.citizenship),
            issue_date: empty_to_none(result.issue_date),
            raw_text: result.raw_text,
            extra_fields,
        }
    } else {
        KtpOcrResultData::default()
    }
}

fn map_job_handle(handle: Option<pb::FaceMatchJobHandle>) -> AsyncJobHandle {
    if let Some(handle) = handle {
        AsyncJobHandle {
            job_id: handle.job_id,
            queue: handle.queue,
        }
    } else {
        AsyncJobHandle {
            job_id: String::new(),
            queue: String::new(),
        }
    }
}

fn map_liveness_handle(handle: Option<pb::LivenessJobHandle>) -> AsyncJobHandle {
    if let Some(handle) = handle {
        AsyncJobHandle {
            job_id: handle.job_id,
            queue: handle.queue,
        }
    } else {
        AsyncJobHandle {
            job_id: String::new(),
            queue: String::new(),
        }
    }
}

fn empty_to_none(value: String) -> Option<String> {
    if value.trim().is_empty() {
        None
    } else {
        Some(value)
    }
}
