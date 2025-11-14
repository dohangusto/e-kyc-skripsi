use crate::internal::domain::repositories::EkycRepository;
use crate::pkg::types::error::AppResult;

pub struct EkycService<R: EkycRepository> {
    repo: R,
}

impl<R: EkycRepository> EkycService<R> {
    pub fn new(repo: R) -> Self {
        Self { repo }
    }

    pub fn start_ekyc(&self, _user_id: &str) -> AppResult<()> {
        Ok(())
    }
}