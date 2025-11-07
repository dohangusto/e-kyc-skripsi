package http

import (
	"fmt"
	"net/http"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes wires all HTTP routes in a single place so the entrypoint only needs
// to create dependencies and pass them into this layer-aware function.
func RegisterRoutes(e *echo.Echo, handler *ApplicationHTTPHandler) {
	e.GET("/healthz", healthz)
	e.GET("/api/applications", handler.List)
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
