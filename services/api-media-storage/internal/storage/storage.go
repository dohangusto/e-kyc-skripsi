package storage

import (
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/google/uuid"
)

type MediaRecord struct {
	ID           string    `json:"id"`
	OriginalName string    `json:"originalName"`
	MimeType     string    `json:"mimeType"`
	Size         int64     `json:"size"`
	URL          string    `json:"url"`
	CreatedAt    time.Time `json:"createdAt"`
}

type FileStorage struct {
	root      string
	publicURL string
	mu        sync.Mutex
}

func NewFileStorage(root, publicURL string) (*FileStorage, error) {
	if err := os.MkdirAll(root, 0o755); err != nil {
		return nil, fmt.Errorf("create media root: %w", err)
	}
	return &FileStorage{root: root, publicURL: trimTrailingSlash(publicURL)}, nil
}

func trimTrailingSlash(input string) string {
	for len(input) > 1 && input[len(input)-1] == '/' {
		input = input[:len(input)-1]
	}
	return input
}

func (s *FileStorage) Create(file *multipart.FileHeader) (*MediaRecord, error) {
	src, err := file.Open()
	if err != nil {
		return nil, err
	}
	defer src.Close()
	return s.save(uuid.NewString(), src, file.Filename, file.Header.Get("Content-Type"), file.Size)
}

func (s *FileStorage) Replace(id string, file *multipart.FileHeader) (*MediaRecord, error) {
	src, err := file.Open()
	if err != nil {
		return nil, err
	}
	defer src.Close()
	return s.save(id, src, file.Filename, file.Header.Get("Content-Type"), file.Size)
}

func (s *FileStorage) save(id string, data multipart.File, original, mime string, size int64) (*MediaRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	dir := filepath.Join(s.root, id)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("prepare dir: %w", err)
	}
	contentPath := filepath.Join(dir, "content")
	dst, err := os.Create(contentPath)
	if err != nil {
		return nil, fmt.Errorf("create content file: %w", err)
	}
	defer dst.Close()
	written, err := io.Copy(dst, data)
	if err != nil {
		return nil, fmt.Errorf("write content: %w", err)
	}
	if size == 0 {
		size = written
	}
	record := &MediaRecord{
		ID:           id,
		OriginalName: original,
		MimeType:     fallback(mime, "application/octet-stream"),
		Size:         size,
		URL:          fmt.Sprintf("%s/media/%s", s.publicURL, id),
		CreatedAt:    time.Now().UTC(),
	}
	metaPath := filepath.Join(dir, "meta.json")
	if err := writeJSON(metaPath, record); err != nil {
		return nil, err
	}
	return record, nil
}

func fallback(value, defaultValue string) string {
	if value == "" {
		return defaultValue
	}
	return value
}

func writeJSON(path string, record *MediaRecord) error {
	data, err := json.Marshal(record)
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}

func (s *FileStorage) Metadata(id string) (*MediaRecord, error) {
	metaPath := filepath.Join(s.root, id, "meta.json")
	data, err := os.ReadFile(metaPath)
	if err != nil {
		return nil, err
	}
	var record MediaRecord
	if err := json.Unmarshal(data, &record); err != nil {
		return nil, err
	}
	return &record, nil
}

func (s *FileStorage) Open(id string) (*os.File, *MediaRecord, error) {
	record, err := s.Metadata(id)
	if err != nil {
		return nil, nil, err
	}
	path := filepath.Join(s.root, id, "content")
	f, err := os.Open(path)
	if err != nil {
		return nil, nil, err
	}
	return f, record, nil
}

func (s *FileStorage) Delete(id string) error {
	dir := filepath.Join(s.root, id)
	return os.RemoveAll(dir)
}
