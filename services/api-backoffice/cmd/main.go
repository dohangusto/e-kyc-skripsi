package main

import (
	"context"
	db "e-kyc/services/api-backoffice/internal/infrastructure/database"
	httpWire "e-kyc/services/api-backoffice/internal/infrastructure/http"
	"e-kyc/services/api-backoffice/internal/infrastructure/repository"
	"e-kyc/services/api-backoffice/internal/service"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
)

const defaultAddr = ":8081"

func main() {
	addr := resolveAddr()
	dsn := resolveDSN()

	ctx := context.Background()
	pool, err := db.ConnectPostgres(ctx, dsn)
	if err != nil {
		log.Fatalf("api-backoffice: connect postgres: %v", err)
	}
	defer pool.Close()

	if err := db.SetupSchemaAndSeed(ctx, pool); err != nil {
		log.Fatalf("api-backoffice: setup schema: %v", err)
	}

	repo := repository.NewApplicationRepository(nil, pool)
	applicationService := service.NewApplicationService(repo)
	handler := httpWire.NewApplicationHandler(applicationService)
	server := httpWire.NewServer(handler)

	ctx, stop := signal.NotifyContext(ctx, os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		if err := server.Start(addr); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("api-backoffice: server error: %v", err)
		}
	}()

	log.Printf("api-backoffice: listening on %s", addr)

	<-ctx.Done()
	log.Println("api-backoffice: shutdown signal received")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("api-backoffice: graceful shutdown failed: %v", err)
	}

	log.Println("api-backoffice: server stopped")
}

func resolveAddr() string {
	addr := defaultAddr
	if fromEnv := os.Getenv("BACKOFFICE_HTTP_ADDR"); fromEnv != "" {
		addr = fromEnv
	} else if legacy := os.Getenv("API_BACKOFFICE_PORT"); legacy != "" {
		// Kubernetes injects API_BACKOFFICE_PORT like tcp://IP:PORT. Strip the scheme for compatibility.
		addr = legacy
	}

	if strings.Contains(addr, "://") {
		parts := strings.SplitN(addr, "://", 2)
		if len(parts) == 2 {
			addr = parts[1]
		}
	}

	return addr
}

const defaultDSN = "postgres://postgres:postgres@localhost:5432/ekyc_backoffice?sslmode=disable"

func resolveDSN() string {
	if fromEnv := os.Getenv("BACKOFFICE_DB_DSN"); fromEnv != "" {
		return fromEnv
	}
	return defaultDSN
}
