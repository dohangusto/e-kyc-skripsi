use std::env;

pub struct EnvItem {
    pub key: &'static str,
    pub default: &'static str,
}

pub struct Env;

const ENV_ITEMS: [EnvItem; 4] = [
    EnvItem {
        key: "AI_SUPPORT_GRPC_ENDPOINT",
        default: "http://127.0.0.1:50052",
    },
    EnvItem {
        key: "BACKOFFICE_HTTP_ENDPOINT",
        default: "http://127.0.0.1:8081",
    },
    EnvItem {
        key: "MEDIA_STORAGE_HTTP_ENDPOINT",
        default: "http://127.0.0.1:8090",
    },
    EnvItem {
        key: "FACE_MATCH_THRESHOLD",
        default: "0.78",
    },
];

impl Env {
    pub fn retrieve(key: &str) -> String {
        let default_value = ENV_ITEMS
            .iter()
            .find(|item| item.key == key)
            .map(|item| item.default)
            .unwrap_or("");

        env::var(key).unwrap_or_else(|_| default_value.to_string())
    }
}
