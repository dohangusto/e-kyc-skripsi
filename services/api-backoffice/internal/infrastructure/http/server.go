package http

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	gommonLog "github.com/labstack/gommon/log"
)

func NewServer(appHandler *ApplicationHTTPHandler, backofficeHandler *BackofficeHTTPHandler, authHandler *AuthHTTPHandler) *echo.Echo {
	e := echo.New()
	e.HideBanner = true
	e.Logger.SetLevel(gommonLog.INFO)

	configureMiddleware(e)
	RegisterRoutes(e, appHandler, backofficeHandler, authHandler)

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
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(config))

}
