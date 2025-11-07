package http

import (
	"net/http"

	domain "e-kyc/services/api-backoffice/internal/domain"
	"github.com/labstack/echo/v4"
)

// ApplicationHTTPHandler wires ApplicationService to net/http.
type ApplicationHTTPHandler struct {
	Service domain.ApplicationService
}

func NewApplicationHandler(service domain.ApplicationService) *ApplicationHTTPHandler {
	return &ApplicationHTTPHandler{Service: service}
}

func (h *ApplicationHTTPHandler) List(c echo.Context) error {
	apps, err := h.Service.ListApplications(c.Request().Context())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "internal server error")
	}

	return c.JSON(http.StatusOK, struct {
		Data interface{} `json:"data"`
	}{Data: apps})
}
