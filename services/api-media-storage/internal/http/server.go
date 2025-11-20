package http

import (
	"fmt"
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	"e-kyc/services/api-media-storage/internal/storage"
)

type Server struct {
	app     *echo.Echo
	storage *storage.FileStorage
}

func NewServer(store *storage.FileStorage) *Server {
	e := echo.New()
	e.HideBanner = true
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	srv := &Server{app: e, storage: store}
	srv.registerRoutes()
	return srv
}

func (s *Server) registerRoutes() {
	s.app.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})
	s.app.POST("/media", s.handleUpload)
	s.app.PUT("/media/:id", s.handleReplace)
	s.app.GET("/media/:id", s.handleDownload)
	s.app.GET("/media/:id/meta", s.handleMetadata)
	s.app.DELETE("/media/:id", s.handleDelete)
}

func (s *Server) Start(addr string) error {
	return s.app.Start(addr)
}

func (s *Server) handleUpload(c echo.Context) error {
	file, err := c.FormFile("file")
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "file field is required")
	}
	record, err := s.storage.Create(file)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusCreated, record)
}

func (s *Server) handleReplace(c echo.Context) error {
	id := c.Param("id")
	file, err := c.FormFile("file")
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "file field is required")
	}
	record, err := s.storage.Replace(id, file)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, record)
}

func (s *Server) handleDownload(c echo.Context) error {
	id := c.Param("id")
	file, record, err := s.storage.Open(id)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "media not found")
	}
	defer file.Close()
	c.Response().Header().Set(echo.HeaderContentType, record.MimeType)
	disposition := fmt.Sprintf("inline; filename=\"%s\"", record.OriginalName)
	c.Response().Header().Set("Content-Disposition", disposition)
	return c.Stream(http.StatusOK, record.MimeType, file)
}

func (s *Server) handleMetadata(c echo.Context) error {
	id := c.Param("id")
	record, err := s.storage.Metadata(id)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "media not found")
	}
	return c.JSON(http.StatusOK, record)
}

func (s *Server) handleDelete(c echo.Context) error {
	id := c.Param("id")
	if err := s.storage.Delete(id); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.NoContent(http.StatusNoContent)
}
