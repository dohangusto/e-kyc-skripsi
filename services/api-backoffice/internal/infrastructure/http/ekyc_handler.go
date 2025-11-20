package http

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	domain "e-kyc/services/api-backoffice/internal/domain"

	"github.com/labstack/echo/v4"
)

type EkycHTTPHandler struct {
	svc domain.EkycService
}

func NewEkycHTTPHandler(svc domain.EkycService) *EkycHTTPHandler {
	return &EkycHTTPHandler{svc: svc}
}

func (h *EkycHTTPHandler) CreateSession(c echo.Context) error {
	var payload domain.CreateEkycSessionParams
	if err := c.Bind(&payload); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid payload"})
	}
	session, err := h.svc.CreateSession(c.Request().Context(), payload)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusCreated, session)
}

type artifactsPayload struct {
	IDCardURL          *string `json:"idCardUrl"`
	SelfieWithIDURL    *string `json:"selfieWithIdUrl"`
	RecordedVideoURL   *string `json:"recordedVideoUrl"`
	Status             *string `json:"status"`
	FaceMatchingStatus *string `json:"faceMatchingStatus"`
	LivenessStatus     *string `json:"livenessStatus"`
}

func (h *EkycHTTPHandler) UpdateArtifacts(c echo.Context) error {
	sessionID := c.Param("id")
	var payload artifactsPayload
	if err := c.Bind(&payload); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid payload"})
	}
	session, err := h.svc.UpdateArtifacts(c.Request().Context(), domain.UpdateEkycArtifactsParams{
		SessionID:          sessionID,
		IDCardURL:          payload.IDCardURL,
		SelfieWithIDURL:    payload.SelfieWithIDURL,
		RecordedVideoURL:   payload.RecordedVideoURL,
		Status:             payload.Status,
		FaceMatchingStatus: payload.FaceMatchingStatus,
		LivenessStatus:     payload.LivenessStatus,
	})
	if err != nil {
		code, body := mapError(err)
		return c.JSON(code, body)
	}
	return c.JSON(http.StatusOK, session)
}

func (h *EkycHTTPHandler) RecordFaceChecks(c echo.Context) error {
	sessionID := c.Param("id")
	var payload struct {
		Overall string                  `json:"overallResult"`
		Status  string                  `json:"status"`
		Checks  []domain.FaceCheckInput `json:"checks"`
	}
	if err := c.Bind(&payload); err != nil || payload.Status == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid payload"})
	}
	session, err := h.svc.RecordFaceChecks(c.Request().Context(), domain.SaveFaceChecksParams{
		SessionID: sessionID,
		Checks:    payload.Checks,
		Overall:   payload.Overall,
		Status:    payload.Status,
	})
	if err != nil {
		code, body := mapError(err)
		return c.JSON(code, body)
	}
	return c.JSON(http.StatusOK, session)
}

func (h *EkycHTTPHandler) RecordLiveness(c echo.Context) error {
	sessionID := c.Param("id")
	var payload struct {
		Overall    string         `json:"overallResult"`
		PerGesture map[string]any `json:"perGestureResult"`
		VideoURL   *string        `json:"recordedVideoUrl"`
		Status     string         `json:"status"`
		Metadata   map[string]any `json:"rawMetadata"`
	}
	if err := c.Bind(&payload); err != nil || payload.Status == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid payload"})
	}
	session, err := h.svc.RecordLiveness(c.Request().Context(), domain.SaveLivenessResultParams{
		SessionID:  sessionID,
		Overall:    payload.Overall,
		PerGesture: payload.PerGesture,
		VideoURL:   payload.VideoURL,
		Status:     payload.Status,
		Metadata:   payload.Metadata,
	})
	if err != nil {
		code, body := mapError(err)
		return c.JSON(code, body)
	}
	return c.JSON(http.StatusOK, session)
}

type applicantPayload struct {
	FullName  string `json:"fullName"`
	Nik       string `json:"nik"`
	BirthDate string `json:"birthDate"`
	Address   string `json:"address"`
	Phone     string `json:"phone"`
	Email     string `json:"email"`
	Pin       string `json:"pin"`
}

func (h *EkycHTTPHandler) AssignApplicant(c echo.Context) error {
	sessionID := c.Param("id")
	var payload applicantPayload
	if err := c.Bind(&payload); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid payload"})
	}
	var birthPtr *time.Time
	if strings.TrimSpace(payload.BirthDate) != "" {
		if parsed, err := time.Parse("2006-01-02", payload.BirthDate); err == nil {
			birthPtr = &parsed
		} else {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "format tanggal lahir tidak valid"})
		}
	}
	session, err := h.svc.AssignApplicant(c.Request().Context(), domain.ApplicantSubmission{
		SessionID: sessionID,
		FullName:  payload.FullName,
		Nik:       payload.Nik,
		BirthDate: birthPtr,
		Address:   payload.Address,
		Phone:     payload.Phone,
		Email:     payload.Email,
		Pin:       payload.Pin,
	})
	if err != nil {
		code, body := mapError(err)
		return c.JSON(code, body)
	}
	return c.JSON(http.StatusOK, session)
}

func (h *EkycHTTPHandler) ListSessions(c echo.Context) error {
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	params := domain.ListEkycSessionsParams{
		Status:        c.QueryParam("status"),
		FinalDecision: c.QueryParam("finalDecision"),
		Limit:         limit,
	}
	sessions, err := h.svc.ListSessions(c.Request().Context(), params)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, sessions)
}

func (h *EkycHTTPHandler) GetSession(c echo.Context) error {
	session, err := h.svc.GetSession(c.Request().Context(), c.Param("id"))
	if err != nil {
		code, body := mapError(err)
		return c.JSON(code, body)
	}
	return c.JSON(http.StatusOK, session)
}

func (h *EkycHTTPHandler) Finalize(c echo.Context) error {
	session, err := h.svc.FinalizeSession(c.Request().Context(), c.Param("id"))
	if err != nil {
		code, body := mapError(err)
		return c.JSON(code, body)
	}
	return c.JSON(http.StatusOK, session)
}

func (h *EkycHTTPHandler) OverrideDecision(c echo.Context) error {
	sessionID := c.Param("id")
	var payload struct {
		FinalDecision string  `json:"finalDecision"`
		Reason        *string `json:"reason"`
	}
	if err := c.Bind(&payload); err != nil || payload.FinalDecision == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid payload"})
	}
	session, err := h.svc.OverrideDecision(c.Request().Context(), domain.UpdateEkycDecisionParams{
		SessionID:     sessionID,
		FinalDecision: payload.FinalDecision,
		Reason:        payload.Reason,
	})
	if err != nil {
		code, body := mapError(err)
		return c.JSON(code, body)
	}
	return c.JSON(http.StatusOK, session)
}

func mapError(err error) (int, map[string]string) {
	if errors.Is(err, domain.ErrNotFound) {
		return http.StatusNotFound, map[string]string{"error": "not found"}
	}
	return http.StatusInternalServerError, map[string]string{"error": err.Error()}
}
