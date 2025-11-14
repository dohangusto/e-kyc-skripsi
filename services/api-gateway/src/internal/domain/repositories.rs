use crate::pkg::types::error::AppResult;
use crate::internal::domain::entities::ekyc::EkycSession;

pub trait EkycRepository: Send + Sync {
    fn save_session(&self, session: &EkycSession) -> AppResult<()>;
    fn find_session(&self, id: &str) -> AppResult<Option<EkycSession>>;
}