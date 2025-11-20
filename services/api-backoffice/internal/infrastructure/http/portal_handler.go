package http

import (
	"errors"
	"net/http"
	"strings"

	domain "e-kyc/services/api-backoffice/internal/domain"

	"github.com/labstack/echo/v4"
)

type PortalHTTPHandler struct {
	Service domain.BackofficeService
}

func NewPortalHTTPHandler(svc domain.BackofficeService) *PortalHTTPHandler {
	return &PortalHTTPHandler{Service: svc}
}

func (h *PortalHTTPHandler) GetSurvey(c echo.Context) error {
	appID := strings.TrimSpace(c.Param("id"))
	if appID == "" {
		return respondError(c, http.StatusBadRequest, errors.New("application id required"))
	}
	survey, err := h.Service.GetSurvey(c.Request().Context(), appID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return respondError(c, http.StatusNotFound, err)
		}
		return respondError(c, http.StatusInternalServerError, err)
	}
	if survey == nil {
		return c.NoContent(http.StatusNoContent)
	}
	return c.JSON(http.StatusOK, survey)
}

type surveyRequest struct {
	Answers map[string]any `json:"answers"`
	Status  string         `json:"status"`
}

func (h *PortalHTTPHandler) SaveSurveyDraft(c echo.Context) error {
	appID := strings.TrimSpace(c.Param("id"))
	if appID == "" {
		return respondError(c, http.StatusBadRequest, errors.New("application id required"))
	}
	var payload surveyRequest
	if err := c.Bind(&payload); err != nil {
		return respondError(c, http.StatusBadRequest, err)
	}
	survey, err := h.Service.SaveSurveyDraft(c.Request().Context(), domain.SurveyDraftParams{
		ApplicationID: appID,
		Answers:       payload.Answers,
		Status:        payload.Status,
	})
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return respondError(c, http.StatusNotFound, err)
		}
		return respondError(c, http.StatusInternalServerError, err)
	}
	return c.JSON(http.StatusOK, survey)
}

func (h *PortalHTTPHandler) SubmitSurvey(c echo.Context) error {
	appID := strings.TrimSpace(c.Param("id"))
	if appID == "" {
		return respondError(c, http.StatusBadRequest, errors.New("application id required"))
	}
	var payload surveyRequest
	if err := c.Bind(&payload); err != nil {
		return respondError(c, http.StatusBadRequest, err)
	}
	survey, err := h.Service.SubmitSurvey(c.Request().Context(), domain.SurveySubmitParams{
		ApplicationID: appID,
		Answers:       payload.Answers,
		Status:        payload.Status,
	})
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return respondError(c, http.StatusNotFound, err)
		}
		return respondError(c, http.StatusInternalServerError, err)
	}
	return c.JSON(http.StatusOK, survey)
}
