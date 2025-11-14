use crate::internal::domain::entities::ekyc::EkycSession;
use crate::internal::domain::repositories::EkycRepository;
use crate::pkg::types::error::AppResult;

pub struct RedisEkycRepository;

impl RedisEkycRepository {
    pub fn new() -> Self {
        Self
    }
}

impl EkycRepository for RedisEkycRepository {
    fn save_session(&self, _session: &EkycSession) -> AppResult<()> {
        Ok(())
    }

    fn find_session(&self, _id: &str) -> AppResult<Option<EkycSession>> {
        Ok(None)
    }
}