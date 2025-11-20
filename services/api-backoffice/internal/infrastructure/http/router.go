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
	ekycHandler *EkycHTTPHandler,
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
	app.POST("/status", backofficeHandler.UpdateApplicationStatus)
	app.POST("/visits", backofficeHandler.CreateVisit)
	app.PATCH("/visits/:visitId", backofficeHandler.UpdateVisit)

	e.GET("/api/visits", backofficeHandler.ListVisits)

	// Config & users
	e.GET("/api/users", backofficeHandler.ListUsers)
	e.GET("/api/config", backofficeHandler.GetConfig)
	e.PUT("/api/config", backofficeHandler.UpdateConfig)

	// Batches
	e.GET("/api/batches", backofficeHandler.ListBatches)
	e.POST("/api/batches", backofficeHandler.CreateBatch)
	e.POST("/api/batches/:id/status", backofficeHandler.UpdateBatchStatus)

	// Distributions
	e.GET("/api/distributions", backofficeHandler.ListDistributions)
	e.POST("/api/distributions", backofficeHandler.CreateDistribution)
	e.POST("/api/distributions/:id/status", backofficeHandler.UpdateDistributionStatus)
	e.POST("/api/distributions/:id/notify", backofficeHandler.NotifyDistribution)

	// Clustering
	e.GET("/api/clustering/runs", backofficeHandler.ListClusteringRuns)
	e.POST("/api/clustering/runs", backofficeHandler.TriggerClusteringRun)
	e.GET("/api/clustering/runs/:id", backofficeHandler.GetClusteringRun)
	e.POST("/api/clustering/runs/:id/candidates/:candidateId/assign", backofficeHandler.AssignClusteringCandidate)
	e.POST("/api/clustering/runs/:id/candidates/:candidateId/status", backofficeHandler.UpdateClusteringCandidateStatus)

	// Audit
	e.GET("/api/audit", backofficeHandler.ListAuditLogs)

	// Overview
	e.GET("/api/overview", backofficeHandler.Overview)

	ekyc := e.Group("/api/ekyc")
	ekyc.POST("/sessions", ekycHandler.CreateSession)
	ekyc.GET("/sessions", ekycHandler.ListSessions)
	ekyc.GET("/sessions/:id", ekycHandler.GetSession)
	ekyc.PATCH("/sessions/:id/artifacts", ekycHandler.UpdateArtifacts)
	ekyc.POST("/sessions/:id/face-checks", ekycHandler.RecordFaceChecks)
	ekyc.POST("/sessions/:id/liveness", ekycHandler.RecordLiveness)
	ekyc.POST("/sessions/:id/applicant", ekycHandler.AssignApplicant)
	ekyc.POST("/sessions/:id/finalize", ekycHandler.Finalize)
	ekyc.PATCH("/sessions/:id/decision", ekycHandler.OverrideDecision)

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
