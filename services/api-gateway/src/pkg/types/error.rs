use thiserror::Error;

pub type AppResult<T> = Result<T, AppError>;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Bad Request: {0}")]
    BadRequest(String),

    #[error("Internal Error")]
    Internal(#[from] anyhow::Error),
}
