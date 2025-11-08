package http

import (
	"net/http"
	"strconv"

	"e-kyc/services/api-backoffice/internal/service"

	"github.com/labstack/echo/v4"
)

type BackofficeHTTPHandler struct {
	Service *service.BackofficeService
}

func NewBackofficeHTTPHandler(svc *service.BackofficeService) *BackofficeHTTPHandler {
	return &BackofficeHTTPHandler{Service: svc}
}

func (h *BackofficeHTTPHandler) ListApplications(c echo.Context) error {
	limitStr := c.QueryParam("limit")
	limit := 0
	if limitStr != "" {
		if v, err := strconv.Atoi(limitStr); err == nil {
			limit = v
		}
	}
	apps, err := h.Service.ListApplications(c.Request().Context(), limit)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"data": apps})
}

func (h *BackofficeHTTPHandler) GetApplication(c echo.Context) error {
	id := c.Param("id")
	app, err := h.Service.GetApplication(c.Request().Context(), id)
	if err != nil {
		if err == service.ErrNotFound {
			return c.JSON(http.StatusNotFound, map[string]string{"error": "application not found"})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, app)
}

func (h *BackofficeHTTPHandler) NotImplemented(c echo.Context) error {
	return c.JSON(http.StatusNotImplemented, map[string]string{"error": "endpoint not implemented yet"})
}
