package http

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"e-kyc/services/api-backoffice/internal/domain"
	"github.com/labstack/echo/v4"
)

type BackofficeHTTPHandler struct {
	Service domain.BackofficeService
}

func NewBackofficeHTTPHandler(svc domain.BackofficeService) *BackofficeHTTPHandler {
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
		return respondError(c, http.StatusInternalServerError, err)
	}
	return c.JSON(http.StatusOK, map[string]any{"data": apps})
}

func (h *BackofficeHTTPHandler) GetApplication(c echo.Context) error {
	id := c.Param("id")
	app, err := h.Service.GetApplication(c.Request().Context(), id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return respondError(c, http.StatusNotFound, err)
		}
		return respondError(c, http.StatusInternalServerError, err)
	}
	return c.JSON(http.StatusOK, app)
}

func (h *BackofficeHTTPHandler) UpdateApplicationStatus(c echo.Context) error {
	id := c.Param("id")
	var req struct {
		Status string `json:"status"`
		Actor  string `json:"actor"`
		Reason string `json:"reason"`
	}
	if err := c.Bind(&req); err != nil {
		return respondError(c, http.StatusBadRequest, err)
	}
	if req.Status == "" || req.Actor == "" {
		return respondError(c, http.StatusBadRequest, errors.New("status and actor required"))
	}
	if err := h.Service.UpdateApplicationStatus(c.Request().Context(), id, req.Status, req.Actor, req.Reason); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return respondError(c, http.StatusNotFound, err)
		}
		return respondError(c, http.StatusInternalServerError, err)
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *BackofficeHTTPHandler) CreateVisit(c echo.Context) error {
	id := c.Param("id")
	var req struct {
		Actor       string `json:"actor"`
		ScheduledAt string `json:"scheduledAt"`
		TkskID      string `json:"tkskId"`
	}
	if err := c.Bind(&req); err != nil {
		return respondError(c, http.StatusBadRequest, err)
	}
	if req.Actor == "" || req.ScheduledAt == "" || req.TkskID == "" {
		return respondError(c, http.StatusBadRequest, errors.New("actor, scheduledAt, tkskId required"))
	}
	t, err := time.Parse(time.RFC3339, req.ScheduledAt)
	if err != nil {
		return respondError(c, http.StatusBadRequest, err)
	}
	visit, err := h.Service.CreateVisit(c.Request().Context(), id, req.Actor, t, req.TkskID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return respondError(c, http.StatusNotFound, err)
		}
		return respondError(c, http.StatusInternalServerError, err)
	}
	return c.JSON(http.StatusCreated, visit)
}

func (h *BackofficeHTTPHandler) UpdateVisit(c echo.Context) error {
	appID := c.Param("id")
	visitID := c.Param("visitId")
	var req struct {
		Actor string `json:"actor"`
		domain.UpdateVisitPayload
	}
	if err := c.Bind(&req); err != nil {
		return respondError(c, http.StatusBadRequest, err)
	}
	if req.Actor == "" {
		return respondError(c, http.StatusBadRequest, errors.New("actor required"))
	}
	if err := h.Service.UpdateVisit(c.Request().Context(), appID, visitID, req.Actor, req.UpdateVisitPayload); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return respondError(c, http.StatusNotFound, err)
		}
		return respondError(c, http.StatusInternalServerError, err)
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *BackofficeHTTPHandler) ListVisits(c echo.Context) error {
	params := domain.ListVisitsParams{
		ApplicationID: c.QueryParam("applicationId"),
		TkskID:        c.QueryParam("tkskId"),
		Status:        c.QueryParam("status"),
	}
	if limitStr := c.QueryParam("limit"); limitStr != "" {
		if v, err := strconv.Atoi(limitStr); err == nil {
			params.Limit = v
		}
	}
	if from := strings.TrimSpace(c.QueryParam("from")); from != "" {
		if t, err := time.Parse(time.RFC3339, from); err == nil {
			params.From = &t
		}
	}
	if to := strings.TrimSpace(c.QueryParam("to")); to != "" {
		if t, err := time.Parse(time.RFC3339, to); err == nil {
			params.To = &t
		}
	}
	visits, err := h.Service.ListVisits(c.Request().Context(), params)
	if err != nil {
		return respondError(c, http.StatusInternalServerError, err)
	}
	return c.JSON(http.StatusOK, map[string]any{"data": visits})
}

func (h *BackofficeHTTPHandler) ListUsers(c echo.Context) error {
	users, err := h.Service.ListUsers(c.Request().Context())
	if err != nil {
		return respondError(c, http.StatusInternalServerError, err)
	}
	return c.JSON(http.StatusOK, map[string]any{"data": users})
}

func (h *BackofficeHTTPHandler) GetConfig(c echo.Context) error {
	cfg, err := h.Service.GetConfig(c.Request().Context())
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return respondError(c, http.StatusNotFound, err)
		}
		return respondError(c, http.StatusInternalServerError, err)
	}
	return c.JSON(http.StatusOK, cfg)
}

func (h *BackofficeHTTPHandler) UpdateConfig(c echo.Context) error {
	var req domain.SystemConfig
	if err := c.Bind(&req); err != nil {
		return respondError(c, http.StatusBadRequest, err)
	}
	cfg, err := h.Service.UpdateConfig(c.Request().Context(), req)
	if err != nil {
		return respondError(c, http.StatusInternalServerError, err)
	}
	return c.JSON(http.StatusOK, cfg)
}

func (h *BackofficeHTTPHandler) ListBatches(c echo.Context) error {
	batches, err := h.Service.ListBatches(c.Request().Context())
	if err != nil {
		return respondError(c, http.StatusInternalServerError, err)
	}
	return c.JSON(http.StatusOK, map[string]any{"data": batches})
}

func (h *BackofficeHTTPHandler) CreateBatch(c echo.Context) error {
	var req struct {
		Code  string   `json:"code"`
		Items []string `json:"items"`
		Actor string   `json:"actor"`
	}
	if err := c.Bind(&req); err != nil {
		return respondError(c, http.StatusBadRequest, err)
	}
	if req.Code == "" || len(req.Items) == 0 || req.Actor == "" {
		return respondError(c, http.StatusBadRequest, errors.New("code, items, actor required"))
	}
	batch, err := h.Service.CreateBatch(c.Request().Context(), req.Code, req.Items, req.Actor)
	if err != nil {
		return respondError(c, http.StatusInternalServerError, err)
	}
	return c.JSON(http.StatusCreated, batch)
}

func (h *BackofficeHTTPHandler) UpdateBatchStatus(c echo.Context) error {
	var req struct {
		Status string `json:"status"`
		Actor  string `json:"actor"`
	}
	if err := c.Bind(&req); err != nil {
		return respondError(c, http.StatusBadRequest, err)
	}
	if req.Status == "" || req.Actor == "" {
		return respondError(c, http.StatusBadRequest, errors.New("status and actor required"))
	}
	if err := h.Service.UpdateBatchStatus(c.Request().Context(), c.Param("id"), req.Status, req.Actor); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return respondError(c, http.StatusNotFound, err)
		}
		return respondError(c, http.StatusInternalServerError, err)
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *BackofficeHTTPHandler) ListDistributions(c echo.Context) error {
	data, err := h.Service.ListDistributions(c.Request().Context())
	if err != nil {
		return respondError(c, http.StatusInternalServerError, err)
	}
	return c.JSON(http.StatusOK, map[string]any{"data": data})
}

func (h *BackofficeHTTPHandler) CreateDistribution(c echo.Context) error {
	var req struct {
		Actor         string   `json:"actor"`
		Name          string   `json:"name"`
		ScheduledAt   string   `json:"scheduled_at"`
		Channel       string   `json:"channel"`
		Location      string   `json:"location"`
		Notes         *string  `json:"notes"`
		BatchCodes    []string `json:"batch_codes"`
		Beneficiaries []string `json:"beneficiaries"`
	}
	if err := c.Bind(&req); err != nil {
		return respondError(c, http.StatusBadRequest, err)
	}
	if req.Actor == "" || req.Name == "" || req.ScheduledAt == "" || req.Channel == "" || req.Location == "" {
		return respondError(c, http.StatusBadRequest, errors.New("actor, name, scheduled_at, channel, location required"))
	}
	t, err := time.Parse(time.RFC3339, req.ScheduledAt)
	if err != nil {
		return respondError(c, http.StatusBadRequest, err)
	}
	dist := &domain.Distribution{
		Name:          req.Name,
		ScheduledAt:   t,
		Channel:       req.Channel,
		Location:      req.Location,
		Notes:         req.Notes,
		BatchCodes:    req.BatchCodes,
		Beneficiaries: req.Beneficiaries,
	}
	created, err := h.Service.CreateDistribution(c.Request().Context(), dist, req.Actor)
	if err != nil {
		return respondError(c, http.StatusInternalServerError, err)
	}
	return c.JSON(http.StatusCreated, created)
}

func (h *BackofficeHTTPHandler) UpdateDistributionStatus(c echo.Context) error {
	var req struct {
		Actor  string `json:"actor"`
		Status string `json:"status"`
	}
	if err := c.Bind(&req); err != nil {
		return respondError(c, http.StatusBadRequest, err)
	}
	if req.Actor == "" || req.Status == "" {
		return respondError(c, http.StatusBadRequest, errors.New("actor and status required"))
	}
	if err := h.Service.UpdateDistributionStatus(c.Request().Context(), c.Param("id"), req.Status, req.Actor); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return respondError(c, http.StatusNotFound, err)
		}
		return respondError(c, http.StatusInternalServerError, err)
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *BackofficeHTTPHandler) NotifyDistribution(c echo.Context) error {
	var req struct {
		Actor string   `json:"actor"`
		Users []string `json:"beneficiaries"`
	}
	if err := c.Bind(&req); err != nil {
		return respondError(c, http.StatusBadRequest, err)
	}
	if req.Actor == "" || len(req.Users) == 0 {
		return respondError(c, http.StatusBadRequest, errors.New("actor and beneficiaries required"))
	}
	if err := h.Service.NotifyDistribution(c.Request().Context(), c.Param("id"), req.Users, req.Actor); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return respondError(c, http.StatusNotFound, err)
		}
		return respondError(c, http.StatusInternalServerError, err)
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *BackofficeHTTPHandler) ListClusteringRuns(c echo.Context) error {
	runs, err := h.Service.ListClusteringRuns(c.Request().Context())
	if err != nil {
		return respondError(c, http.StatusInternalServerError, err)
	}
	return c.JSON(http.StatusOK, map[string]any{"data": runs})
}

func (h *BackofficeHTTPHandler) TriggerClusteringRun(c echo.Context) error {
	var req struct {
		Operator   string `json:"operator"`
		Parameters struct {
			Dataset   string `json:"dataset"`
			Window    string `json:"window"`
			Algorithm string `json:"algorithm"`
		} `json:"parameters"`
		SampleSize int `json:"sampleSize"`
	}
	if err := c.Bind(&req); err != nil {
		return respondError(c, http.StatusBadRequest, err)
	}
	if strings.TrimSpace(req.Operator) == "" {
		return respondError(c, http.StatusBadRequest, errors.New("operator required"))
	}
	payload := domain.ClusteringRunPayload{
		Dataset:    req.Parameters.Dataset,
		Window:     req.Parameters.Window,
		Algorithm:  req.Parameters.Algorithm,
		SampleSize: req.SampleSize,
	}
	run, err := h.Service.TriggerClusteringRun(c.Request().Context(), req.Operator, payload)
	if err != nil {
		return respondError(c, http.StatusInternalServerError, err)
	}
	return c.JSON(http.StatusCreated, run)
}

func (h *BackofficeHTTPHandler) GetClusteringRun(c echo.Context) error {
	run, err := h.Service.GetClusteringRun(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return respondError(c, http.StatusNotFound, err)
		}
		return respondError(c, http.StatusInternalServerError, err)
	}
	return c.JSON(http.StatusOK, run)
}

func (h *BackofficeHTTPHandler) AssignClusteringCandidate(c echo.Context) error {
	runID := c.Param("id")
	candidateID := c.Param("candidateId")
	var req struct {
		Actor  string `json:"actor"`
		TkskID string `json:"tkskId"`
	}
	if err := c.Bind(&req); err != nil {
		return respondError(c, http.StatusBadRequest, err)
	}
	if req.Actor == "" || req.TkskID == "" {
		return respondError(c, http.StatusBadRequest, errors.New("actor and tkskId required"))
	}
	if err := h.Service.AssignClusteringCandidate(c.Request().Context(), runID, candidateID, req.TkskID, req.Actor); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return respondError(c, http.StatusNotFound, err)
		}
		return respondError(c, http.StatusInternalServerError, err)
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *BackofficeHTTPHandler) UpdateClusteringCandidateStatus(c echo.Context) error {
	runID := c.Param("id")
	candidateID := c.Param("candidateId")
	var req struct {
		Actor  string `json:"actor"`
		Status string `json:"status"`
		Notes  string `json:"notes"`
	}
	if err := c.Bind(&req); err != nil {
		return respondError(c, http.StatusBadRequest, err)
	}
	if req.Actor == "" || req.Status == "" {
		return respondError(c, http.StatusBadRequest, errors.New("actor and status required"))
	}
	if err := h.Service.UpdateClusteringCandidateStatus(c.Request().Context(), runID, candidateID, req.Status, req.Actor, req.Notes); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return respondError(c, http.StatusNotFound, err)
		}
		return respondError(c, http.StatusInternalServerError, err)
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *BackofficeHTTPHandler) ListAuditLogs(c echo.Context) error {
	limitStr := c.QueryParam("limit")
	limit := 0
	if limitStr != "" {
		if v, err := strconv.Atoi(limitStr); err == nil {
			limit = v
		}
	}
	logs, err := h.Service.ListAuditLogs(c.Request().Context(), limit)
	if err != nil {
		return respondError(c, http.StatusInternalServerError, err)
	}
	return c.JSON(http.StatusOK, map[string]any{"data": logs})
}

func (h *BackofficeHTTPHandler) Overview(c echo.Context) error {
	data, err := h.Service.Overview(c.Request().Context())
	if err != nil {
		return respondError(c, http.StatusInternalServerError, err)
	}
	return c.JSON(http.StatusOK, data)
}

func respondError(c echo.Context, status int, err error) error {
	if err == nil {
		return c.NoContent(status)
	}
	return c.JSON(status, map[string]string{"error": err.Error()})
}
