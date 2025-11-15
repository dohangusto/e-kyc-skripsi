use crate::internal::domain::entities::ekyc::EkycSession;
use crate::pkg::types::error::AppResult;

pub trait EkycRepository: Send + Sync {
    fn save_session(&self, session: &EkycSession) -> AppResult<()>;
    fn find_session(&self, id: &str) -> AppResult<Option<EkycSession>>;
}
