package config

import "os"

type Config struct {
	BindAddr   string
	DataRoot   string
	PublicBase string
}

const (
	defaultBind   = ":8090"
	defaultRoot   = "./build/media-storage"
	defaultPublic = "http://127.0.0.1:8090"
)

func Load() Config {
	return Config{
		BindAddr:   envOr("MEDIA_STORAGE_HTTP_ADDR", defaultBind),
		DataRoot:   envOr("MEDIA_STORAGE_DATA_ROOT", defaultRoot),
		PublicBase: envOr("MEDIA_STORAGE_PUBLIC_BASE", defaultPublic),
	}
}

func envOr(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
