package http

import (
	"encoding/json"
	"log"
	"net/http"

	domain "e-kyc/services/api-gateway/internal/domain"
)

type FaceMatchingHTTPHandler struct {
	Service domain.FaceMatchingService
}

func NewFaceMatchingHandler(service domain.FaceMatchingService) *FaceMatchingHTTPHandler {
	return &FaceMatchingHTTPHandler{
		Service: service,
	}
}

func (h *FaceMatchingHTTPHandler) Create(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := h.Service.Create(r.Context()); err != nil {
		log.Printf("face matching create failed: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)

	if err := json.NewEncoder(w).Encode(map[string]string{"status": "created"}); err != nil {
		log.Printf("failed to write response: %v", err)
	}
}
