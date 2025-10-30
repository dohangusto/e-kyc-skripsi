package domain

import (
	"context"
	"net/http"
)

type FaceMatchingModel struct {
	ID       int
	UserID   int
	Username string
}

type FaceMatchingRepository interface {
	Create(ctx context.Context) (err error)
}

type FaceMatchingService interface {
	Create(ctx context.Context) (err error)
}

type FaceMatchingHTTPHandler interface {
	Create(w http.ResponseWriter, r *http.Request)
}
