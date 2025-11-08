package http

import (
	"fmt"
	"net/http"

	"github.com/labstack/echo/v4"
)

func RegisterRoutes(
	e *echo.Echo,
	appHandler *ApplicationHTTPHandler,
	backofficeHandler *BackofficeHTTPHandler,
	authHandler *AuthHTTPHandler,
) {
	e.GET("/api/healthz", healthz)

	auth := e.Group("/api/auth")
	auth.POST("/admin/login", authHandler.LoginAdmin)
	auth.POST("/beneficiary/login", authHandler.LoginBeneficiary)
	auth.GET("/me", authHandler.Me)

	// Applications
	e.GET("/api/applications", appHandler.List)
	e.GET("/api/applications/:id", backofficeHandler.GetApplication)
	e.GET("/api/backoffice/applications", backofficeHandler.ListApplications)
	app := e.Group("/api/applications/:id")
	app.POST("/status", backofficeHandler.NotImplemented)
	app.POST("/escalate", backofficeHandler.NotImplemented)
	app.POST("/duplicate/confirm", backofficeHandler.NotImplemented)
	app.POST("/duplicate/ignore", backofficeHandler.NotImplemented)
	app.POST("/visits", backofficeHandler.NotImplemented)
	app.PATCH("/visits/:visitId", backofficeHandler.NotImplemented)

	// Config & users
	e.GET("/api/users", backofficeHandler.NotImplemented)
	e.GET("/api/config", backofficeHandler.NotImplemented)
	e.PUT("/api/config", backofficeHandler.NotImplemented)

	// Batches
	e.GET("/api/batches", backofficeHandler.NotImplemented)
	e.POST("/api/batches", backofficeHandler.NotImplemented)
	e.POST("/api/batches/:id/status", backofficeHandler.NotImplemented)

	// Distributions
	e.GET("/api/distributions", backofficeHandler.NotImplemented)
	e.POST("/api/distributions", backofficeHandler.NotImplemented)
	e.POST("/api/distributions/:id/status", backofficeHandler.NotImplemented)
	e.POST("/api/distributions/:id/notify", backofficeHandler.NotImplemented)

	// Clustering
	e.GET("/api/clustering/runs", backofficeHandler.NotImplemented)
	e.GET("/api/clustering/runs/:id", backofficeHandler.NotImplemented)
	e.POST("/api/clustering/runs/:id/candidates/:candidateId/assign", backofficeHandler.NotImplemented)
	e.POST("/api/clustering/runs/:id/candidates/:candidateId/status", backofficeHandler.NotImplemented)

	e.GET("/api/audit", backofficeHandler.NotImplemented)
	e.GET("/api/overview", backofficeHandler.NotImplemented)

	e.GET("/api/debug", debugRoutesHandler(e))
}

func healthz(c echo.Context) error {
	return c.String(http.StatusOK, "ok")
}

type debugRoute struct {
	Name   string `json:"name"`
	Method string `json:"method"`
}

func debugRoutesHandler(e *echo.Echo) echo.HandlerFunc {
	return func(c echo.Context) error {
		formatted := make([]debugRoute, 0, len(e.Routes()))
		for _, route := range e.Routes() {
			formatted = append(formatted, debugRoute{
				Name:   fmt.Sprintf("%-7s | Path: %s", route.Method, route.Path),
				Method: route.Name,
			})
		}
		return c.JSON(http.StatusOK, formatted)
	}
}
