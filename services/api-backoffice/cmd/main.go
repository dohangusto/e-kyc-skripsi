package main

import (
	"context"
	db "e-kyc/services/api-backoffice/internal/infrastructure/database"
	httpInfra "e-kyc/services/api-backoffice/internal/infrastructure/http"
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

	// REPOSITORIES
	appRepo := repository.NewApplicationRepository(nil, pool)
	authRepo := repository.NewAuthRepository(pool)
	backofficeRepo := repository.NewBackofficeRepository(pool)

	jwtSecret := resolveJWTSecret()
	sessionManager, err := service.NewJWTSessionManager(jwtSecret)
	if err != nil {
		log.Fatalf("api-backoffice: init jwt manager: %v", err)
	}

	// SERVICES
	applicationService := service.NewApplicationService(appRepo)
	authSvc := service.NewAuthService(authRepo, sessionManager)
	backofficeSvc := service.NewBackofficeService(backofficeRepo)
	ekycSvc := service.NewEkycService(backofficeRepo)

	// HANDLERS
	appHandler := httpInfra.NewApplicationHandler(applicationService)
	authHandler := httpInfra.NewAuthHTTPHandler(authSvc)
	backofficeHandler := httpInfra.NewBackofficeHTTPHandler(backofficeSvc)
	ekycHandler := httpInfra.NewEkycHTTPHandler(ekycSvc)
	portalHandler := httpInfra.NewPortalHTTPHandler(backofficeSvc)

	// SERVER
	server := httpInfra.NewServer(appHandler, backofficeHandler, authHandler, ekycHandler, portalHandler)

	// GRACEFUL SHUTDOWN BY ECHO
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

const defaultJWTSecret = "change-me-in-production"

func resolveJWTSecret() string {
	if fromEnv := os.Getenv("BACKOFFICE_JWT_SECRET"); fromEnv != "" {
		return fromEnv
	}
	log.Println("api-backoffice: BACKOFFICE_JWT_SECRET not set, using default development secret")
	return defaultJWTSecret
}
