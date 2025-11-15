use std::collections::BTreeMap;

use crate::internal::domain::entities::ekyc::{AsyncJobHandle, KtpOcrResultData};
use crate::internal::infrastructure::grpc::pb;

/// Translate the raw proto OCR result into the domain structure.
pub fn from_proto_result(result: Option<pb::KtpOcrResult>) -> KtpOcrResultData {
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

pub fn map_job_handle(handle: Option<pb::FaceMatchJobHandle>) -> AsyncJobHandle {
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

pub fn map_liveness_handle(handle: Option<pb::LivenessJobHandle>) -> AsyncJobHandle {
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
