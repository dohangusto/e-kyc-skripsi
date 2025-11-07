package http

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	gommonLog "github.com/labstack/gommon/log"
)

// NewServer configures an Echo instance with middleware and routes but leaves lifecycle
// management to the caller (typically cmd/main.go).
func NewServer(handler *ApplicationHTTPHandler) *echo.Echo {
	e := echo.New()
	e.HideBanner = true
	e.Logger.SetLevel(gommonLog.INFO)

	configureMiddleware(e)
	RegisterRoutes(e, handler)

	return e
}

func configureMiddleware(e *echo.Echo) {
	config := middleware.CORSConfig{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions},
		AllowHeaders:     []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
		AllowCredentials: true,
		MaxAge:           3600,
	}

	e.Use(middleware.Logger())
	// Recover keeps the server alive even if a handler panics.
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(config))

}
