package domain

import (
	"context"

	"github.com/labstack/echo/v4"

	types "e-kyc/services/api-backoffice/pkg/types"
)

type ApplicationRepository interface {
	ListApplications(ctx context.Context) ([]types.ApplicationSummary, error)
}

type ApplicationService interface {
	ListApplications(ctx context.Context) ([]types.ApplicationSummary, error)
}

type ApplicationHTTPHandler interface {
	List(c echo.Context) error
}
