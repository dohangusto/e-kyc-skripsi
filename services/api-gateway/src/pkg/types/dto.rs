use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct HealthCheckResponse {
    pub status: String,
}

// Nanti DTO lain (response E-KYC, dsb) bisa taro di sini juga.