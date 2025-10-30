package main

import (
	"context"
	httpHandler "e-kyc/services/api-gateway/internal/infrastructure/http"
	"e-kyc/services/api-gateway/internal/infrastructure/repository"
	"e-kyc/services/api-gateway/internal/service"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

var (
	servicePort = ":8080"
)

func main() {
	faceMatchingRepo := repository.NewFaceMatchingRepository()
	faceMatchingService := service.NewFaceMatchingService(faceMatchingRepo)
	handler := httpHandler.NewFaceMatchingHandler(faceMatchingService)

	mux := http.NewServeMux()
	mux.HandleFunc("/face-matching", handler.Create)

	server := &http.Server{
		Addr:    servicePort,
		Handler: mux,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		<-ctx.Done()
		log.Println("Shutting down server...")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			log.Printf("HTTP server shutdown error: %v", err)
		}
	}()

	log.Printf("HTTP server is listening on %s", servicePort)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("HTTP server error: %v", err)
	}

	log.Println("Server stopped.")
}
