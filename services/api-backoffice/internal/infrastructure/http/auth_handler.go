package http

import (
	"errors"
	"net/http"
	"strings"

	"e-kyc/services/api-backoffice/internal/domain"
	"e-kyc/services/api-backoffice/internal/service"

	"github.com/labstack/echo/v4"
)

type AuthHTTPHandler struct {
	Service domain.AuthService
}

func NewAuthHTTPHandler(svc domain.AuthService) *AuthHTTPHandler {
	return &AuthHTTPHandler{Service: svc}
}

type loginAdminRequest struct {
	NIK string `json:"nik"`
	PIN string `json:"pin"`
}

type loginCitizenRequest struct {
	Phone string `json:"phone"`
	PIN   string `json:"pin"`
}

type eligibilityRequest struct {
	Name string `json:"name"`
	NIK  string `json:"nik"`
}

func (h *AuthHTTPHandler) LoginAdmin(c echo.Context) error {
	var payload loginAdminRequest
	if err := c.Bind(&payload); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid payload"})
	}
	res, err := h.Service.LoginAdmin(c.Request().Context(), payload.NIK, payload.PIN)
	if err != nil {
		status := http.StatusUnauthorized
		if !errors.Is(err, service.ErrInvalidCredential) {
			status = http.StatusInternalServerError
		}
		return c.JSON(status, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, res)
}

func (h *AuthHTTPHandler) LoginBeneficiary(c echo.Context) error {
	var payload loginCitizenRequest
	if err := c.Bind(&payload); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid payload"})
	}
	res, err := h.Service.LoginBeneficiary(c.Request().Context(), payload.Phone, payload.PIN)
	if err != nil {
		status := http.StatusUnauthorized
		if !errors.Is(err, service.ErrInvalidCredential) {
			status = http.StatusInternalServerError
		}
		return c.JSON(status, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, res)
}

func (h *AuthHTTPHandler) Me(c echo.Context) error {
	token := parseBearer(c.Request().Header.Get("Authorization"))
	if token == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "missing token"})
	}
	sess, ok := h.Service.Validate(token)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "invalid token"})
	}
	return c.JSON(http.StatusOK, sess)
}

func (h *AuthHTTPHandler) CheckEligibility(c echo.Context) error {
	var payload eligibilityRequest
	if err := c.Bind(&payload); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid payload"})
	}
	user, err := h.Service.CheckBeneficiaryEligibility(
		c.Request().Context(),
		strings.TrimSpace(payload.Name),
		strings.TrimSpace(payload.NIK),
	)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredential) {
			return c.JSON(http.StatusOK, map[string]any{
				"eligible": false,
				"reason":   "Akun tidak memenuhi kriteria e-KYC",
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{
		"eligible": true,
		"user":     user,
	})
}

func parseBearer(header string) string {
	if header == "" {
		return ""
	}
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 {
		return ""
	}
	if !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return strings.TrimSpace(parts[1])
}
