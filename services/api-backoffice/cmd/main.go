package main

import (
	"context"
	httpWire "e-kyc/services/api-backoffice/internal/infrastructure/http"
	"e-kyc/services/api-backoffice/internal/infrastructure/repository"
	"e-kyc/services/api-backoffice/internal/service"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

const defaultAddr = ":8081"

func main() {
	addr := defaultAddr
	if fromEnv := os.Getenv("API_BACKOFFICE_PORT"); fromEnv != "" {
		addr = fromEnv
	}

	repo := repository.NewApplicationRepository(nil)
	applicationService := service.NewApplicationService(repo)
	handler := httpWire.NewApplicationHandler(applicationService)
	server := httpWire.NewServer(handler)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
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
