use anyhow::anyhow;
use reqwest::{Client, multipart};
use serde::Deserialize;

use crate::pkg::types::error::{AppError, AppResult};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaUploadResponse {
    pub url: String,
}

#[derive(Clone)]
pub struct MediaClient {
    base_url: String,
    client: Client,
}

impl MediaClient {
    pub fn new(base_url: &str) -> AppResult<Self> {
        let normalized = normalize(base_url);
        Ok(Self {
            base_url: normalized,
            client: Client::new(),
        })
    }

    pub async fn upload(
        &self,
        field_name: &str,
        bytes: Vec<u8>,
        filename: Option<&str>,
        mime: Option<&str>,
    ) -> AppResult<MediaUploadResponse> {
        let url = format!("{}/media", self.base_url);
        let mut part = multipart::Part::bytes(bytes);
        if let Some(name) = filename {
            part = part.file_name(name.to_string());
        }
        if let Some(content_type) = mime {
            part = part
                .mime_str(content_type)
                .map_err(|e| AppError::Internal(e.into()))?;
        }
        let form = multipart::Form::new().part(field_name.to_string(), part);
        let builder = self.client.post(url).multipart(form);
        self.send_json(builder).await
    }

    pub async fn download_bytes(&self, url: &str) -> AppResult<Vec<u8>> {
        self.client
            .get(url)
            .send()
            .await
            .map_err(|e| AppError::Internal(e.into()))?
            .bytes()
            .await
            .map(|b| b.to_vec())
            .map_err(|e| AppError::Internal(e.into()))
    }

    async fn send_json(&self, builder: reqwest::RequestBuilder) -> AppResult<MediaUploadResponse> {
        let response = builder
            .send()
            .await
            .map_err(|e| AppError::Internal(e.into()))?;
        if !response.status().is_success() {
            let text = response
                .text()
                .await
                .unwrap_or_else(|_| "media service error".to_string());
            return Err(AppError::Internal(anyhow!(text)));
        }
        response
            .json::<MediaUploadResponse>()
            .await
            .map_err(|e| AppError::Internal(e.into()))
    }
}

fn normalize(base: &str) -> String {
    if base.ends_with('/') {
        base.trim_end_matches('/').to_string()
    } else {
        base.to_string()
    }
}
