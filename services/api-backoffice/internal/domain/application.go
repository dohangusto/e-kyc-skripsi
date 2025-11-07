package domain

import (
	"context"

	"github.com/labstack/echo/v4"

	types "e-kyc/services/api-backoffice/pkg/types"
)

// ApplicationRepository abstracts persistence for application projections.
type ApplicationRepository interface {
	ListApplications(ctx context.Context) ([]types.ApplicationSummary, error)
}

// ApplicationService exposes business operations consumed by transports.
type ApplicationService interface {
	ListApplications(ctx context.Context) ([]types.ApplicationSummary, error)
}

// ApplicationHTTPHandler describes the HTTP transport expected by the router.
type ApplicationHTTPHandler interface {
	List(c echo.Context) error
}
