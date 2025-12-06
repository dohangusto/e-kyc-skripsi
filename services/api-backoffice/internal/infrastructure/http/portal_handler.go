package http

import (
	"errors"
	"net/http"
	"strings"
	"time"

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

func (h *PortalHTTPHandler) ListBatches(c echo.Context) error {
	userID := strings.TrimSpace(c.Param("userId"))
	if userID == "" {
		return respondError(c, http.StatusBadRequest, errors.New("user id required"))
	}
	batches, err := h.Service.ListBatchesByUser(c.Request().Context(), userID)
	if err != nil {
		return respondError(c, http.StatusInternalServerError, err)
	}
	type batchView struct {
		ID        string    `json:"id"`
		Code      string    `json:"code"`
		CreatedAt time.Time `json:"created_at"`
	}
	out := make([]batchView, 0, len(batches))
	for _, b := range batches {
		out = append(out, batchView{ID: b.ID, Code: b.Code, CreatedAt: b.CreatedAt})
	}
	return c.JSON(http.StatusOK, map[string]any{"data": out})
}

type surveyRequest struct {
	Answers map[string]any `json:"answers"`
	Status  string         `json:"status"`
}

func (h *PortalHTTPHandler) latestBatchForUser(c echo.Context) error {
	appID := strings.TrimSpace(c.Param("id"))
	if appID == "" {
		return respondError(c, http.StatusBadRequest, errors.New("application id required"))
	}
	batches, err := h.Service.ListBatchesByApplication(c.Request().Context(), appID)
	if err != nil {
		return respondError(c, http.StatusInternalServerError, err)
	}
	if len(batches) == 0 {
		return c.JSON(http.StatusOK, map[string]any{"data": map[string]any{}})
	}
	b := batches[0]
	return c.JSON(http.StatusOK, map[string]any{
		"data": map[string]any{
			"id":         b.ID,
			"code":       b.Code,
			"created_at": b.CreatedAt,
		},
	})
}

func (h *PortalHTTPHandler) ListDistributions(c echo.Context) error {
	appID := strings.TrimSpace(c.Param("id"))
	if appID == "" {
		return respondError(c, http.StatusBadRequest, errors.New("application id required"))
	}
	dists, err := h.Service.ListDistributionsByApplication(c.Request().Context(), appID)
	if err != nil {
		return respondError(c, http.StatusInternalServerError, err)
	}
	type distView struct {
		ID          string    `json:"id"`
		Name        string    `json:"name"`
		ScheduledAt time.Time `json:"scheduled_at"`
		Channel     string    `json:"channel"`
		Location    string    `json:"location"`
		Status      string    `json:"status"`
		Notes       *string   `json:"notes,omitempty"`
		UpdatedAt   time.Time `json:"updated_at"`
		BatchCodes  []string  `json:"batch_codes"`
	}
	out := make([]distView, 0, len(dists))
	for _, d := range dists {
		out = append(out, distView{
			ID:          d.ID,
			Name:        d.Name,
			ScheduledAt: d.ScheduledAt,
			Channel:     d.Channel,
			Location:    d.Location,
			Status:      d.Status,
			Notes:       d.Notes,
			UpdatedAt:   d.UpdatedAt,
			BatchCodes:  d.BatchCodes,
		})
	}
	return c.JSON(http.StatusOK, map[string]any{"data": out})
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
