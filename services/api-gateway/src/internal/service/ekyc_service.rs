use std::sync::Arc;

use tracing::warn;

use crate::internal::domain::entities::ekyc::{
    BinaryImage, StartFaceMatchJobPayload, StartLivenessJobPayload,
};
use crate::internal::domain::services::AiSupportPort;
use crate::internal::infrastructure::http::backoffice_proxy::{
    BackofficeClient, EkycSessionDto, UpdateSessionPatch,
};
use crate::internal::infrastructure::http::media_client::{MediaClient, MediaUploadResponse};
use crate::pkg::types::error::{AppError, AppResult};

#[derive(Clone)]
pub struct UploadedFile {
    pub filename: Option<String>,
    pub mime_type: Option<String>,
    pub bytes: Vec<u8>,
}

pub struct ApplicantSubmission {
    pub full_name: String,
    pub nik: String,
    pub birth_date: String,
    pub address: String,
    pub phone: String,
    pub email: String,
    pub pin: String,
}

pub struct EkycService<P: AiSupportPort> {
    ai_port: P,
    backoffice: Arc<BackofficeClient>,
    media_client: Arc<MediaClient>,
    face_threshold: f64,
}

impl<P: AiSupportPort> EkycService<P> {
    pub fn new(
        ai_port: P,
        backoffice: Arc<BackofficeClient>,
        media_client: Arc<MediaClient>,
        face_threshold: f64,
    ) -> Self {
        Self {
            ai_port,
            backoffice,
            media_client,
            face_threshold,
        }
    }

    pub async fn create_session(&self, user_id: Option<String>) -> AppResult<EkycSessionDto> {
        self.backoffice
            .create_ekyc_session(user_id.as_deref())
            .await
    }

    pub async fn upload_id_card(
        &self,
        session_id: &str,
        file: UploadedFile,
    ) -> AppResult<EkycSessionDto> {
        self.ensure_not_empty(&file)?;
        let stored = self
            .upload_file_to_storage(session_id, "id-card", &file)
            .await?;
        let patch = UpdateSessionPatch {
            id_card_url: Some(&stored.url),
            ..Default::default()
        };
        self.backoffice
            .update_ekyc_session(session_id, &patch)
            .await
    }

    pub async fn upload_selfie(
        &self,
        session_id: &str,
        file: UploadedFile,
    ) -> AppResult<EkycSessionDto> {
        self.ensure_not_empty(&file)?;
        let selfie_bytes = file.bytes.clone();
        let stored = self
            .upload_file_to_storage(session_id, "selfie", &file)
            .await?;
        let patch = UpdateSessionPatch {
            selfie_with_id_url: Some(&stored.url),
            face_matching_status: Some("QUEUED"),
            ..Default::default()
        };
        let session = self
            .backoffice
            .update_ekyc_session(session_id, &patch)
            .await?;
        self.try_start_face_match(&session, &selfie_bytes, file.mime_type.as_deref())
            .await?;
        Ok(session)
    }

    pub async fn start_liveness(
        &self,
        session_id: &str,
        frames: Vec<BinaryImage>,
        gestures: Vec<String>,
    ) -> AppResult<EkycSessionDto> {
        if frames.is_empty() {
            return Err(AppError::BadRequest(
                "minimal satu frame liveness diperlukan".to_string(),
            ));
        }
        let patch = UpdateSessionPatch {
            liveness_status: Some("RUNNING"),
            status: Some("UNDER_REVIEW"),
            ..Default::default()
        };
        let session = self
            .backoffice
            .update_ekyc_session(session_id, &patch)
            .await?;
        let payload = StartLivenessJobPayload {
            session_id: session.id.clone(),
            liveness_frames: frames,
            gestures,
        };
        if let Err(err) = self.ai_port.start_liveness_job(payload).await {
            warn!(
                session_id = %session.id,
                error = ?err,
                "failed to enqueue liveness job"
            );
        }
        Ok(session)
    }

    pub async fn get_session(&self, session_id: &str) -> AppResult<EkycSessionDto> {
        self.backoffice.get_ekyc_session(session_id).await
    }

    pub async fn submit_applicant(
        &self,
        session_id: &str,
        payload: ApplicantSubmission,
    ) -> AppResult<EkycSessionDto> {
        if payload.phone.trim().is_empty() {
            return Err(AppError::BadRequest(
                "nomor HP wajib diisi untuk membuat akun".to_string(),
            ));
        }
        if payload.full_name.trim().is_empty() {
            return Err(AppError::BadRequest("nama lengkap wajib diisi".to_string()));
        }
        let request =
            crate::internal::infrastructure::http::backoffice_proxy::ApplicantSubmissionRequest {
                full_name: payload.full_name.as_str(),
                nik: payload.nik.as_str(),
                birth_date: payload.birth_date.as_str(),
                address: payload.address.as_str(),
                phone: payload.phone.as_str(),
                email: payload.email.as_str(),
                pin: payload.pin.as_str(),
            };
        self.backoffice.submit_applicant(session_id, request).await
    }

    async fn upload_file_to_storage(
        &self,
        _session_id: &str,
        _kind: &str,
        file: &UploadedFile,
    ) -> AppResult<MediaUploadResponse> {
        self.media_client
            .upload(
                "file",
                file.bytes.clone(),
                file.filename.as_deref(),
                file.mime_type.as_deref(),
            )
            .await
    }

    async fn try_start_face_match(
        &self,
        session: &EkycSessionDto,
        selfie_bytes: &[u8],
        selfie_mime: Option<&str>,
    ) -> AppResult<()> {
        if !session.face_matching_status.eq_ignore_ascii_case("QUEUED") {
            return Ok(());
        }
        let id_card_url = match &session.id_card_url {
            Some(url) => url,
            None => return Ok(()),
        };
        let ktp_bytes = match self.media_client.download_bytes(id_card_url).await {
            Ok(bytes) => bytes,
            Err(err) => {
                warn!(
                    session_id = %session.id,
                    error = ?err,
                    "failed to download id card image"
                );
                return Ok(());
            }
        };
        let payload = StartFaceMatchJobPayload {
            session_id: session.id.clone(),
            ktp_image: BinaryImage {
                content: ktp_bytes,
                mime_type: None,
            },
            selfie_image: BinaryImage {
                content: selfie_bytes.to_vec(),
                mime_type: selfie_mime.map(|s| s.to_string()),
            },
            face_match_threshold: self.face_threshold,
        };
        if let Err(err) = self.ai_port.start_face_match_job(payload).await {
            warn!(
                session_id = %session.id,
                error = ?err,
                "failed to enqueue face match job"
            );
        }
        Ok(())
    }

    fn ensure_not_empty(&self, file: &UploadedFile) -> AppResult<()> {
        if file.bytes.is_empty() {
            return Err(AppError::BadRequest("file tidak boleh kosong".to_string()));
        }
        Ok(())
    }
}
