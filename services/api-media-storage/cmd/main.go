package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"e-kyc/services/api-media-storage/internal/config"
	mediahttp "e-kyc/services/api-media-storage/internal/http"
	"e-kyc/services/api-media-storage/internal/storage"
)

func main() {
	cfg := config.Load()
	store, err := storage.NewFileStorage(cfg.DataRoot, cfg.PublicBase)
	if err != nil {
		log.Fatalf("media-storage: init storage: %v", err)
	}

	server := mediahttp.NewServer(store)

	go func() {
		if err := server.Start(cfg.BindAddr); err != nil {
			log.Fatalf("media-storage: server stopped: %v", err)
		}
	}()

	log.Printf("media-storage: listening on %s", cfg.BindAddr)

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
	<-sig
	log.Println("media-storage: shutting down")
}
