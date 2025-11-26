package db

import (
	"fmt"
	"strings"

	"github.com/xuri/excelize/v2"
)

// DatasetRecord holds the normalized payload extracted from the XLSX dataset.
type DatasetRecord struct {
	RowNo  int
	Name   string
	Nik    string
	Fields map[string]string
}

var headerMap = map[string]string{
	"NIK":                                   "nik",
	"Nama":                                  "name",
	"Tahun Lahir":                           "birthYear",
	"Umur":                                  "age",
	"Status":                                "householdRole",
	"Pekerjaan":                             "occupation",
	"Penghasilan":                           "income",
	"Pendidikan":                            "education",
	"Jumlah Tanggungan":                     "dependents",
	"Status Kepemilikan Rumah":              "homeOwnership",
	"Jenis Lantai":                          "floorType",
	"Jenis Dinding":                         "wallType",
	"Jenis Atap":                            "roofType",
	"Bahan Bakar":                           "cookingFuel",
	"Jenis Kloset":                          "toiletType",
	"Tempat Buang Air Besar (MCK / Toilet)": "toiletFacility",
	"Pembungan Akhir Tinja":                 "sewageDisposal",
	"Sumber Air Minum":                      "waterSource",
	"Sumber Penerangan":                     "lighting",
	"Kepemilikan Aset Gerak":                "movableAssets",
	"Jumlah Aset Gerak":                     "movableAssetCount",
	"Kepemilikan Aset Tidak bergerak":       "immovableAssets",
	"Jumlah Aset Tidak Bergerak":            "immovableAssetCount",
	"Kepemilikan Lahan/Ternak":              "landOwnership",
	"Jumlah Anak Sekolah":                   "schoolChildren",
	"Balita/Anak Usia Dini":                 "toddlers",
	"Lansia (>60 tahun)":                    "elderly",
	"Disabilitas/Penyakit Kronis":           "disability",
}

// LoadBeneficiaryDataset parses the XLSX workbook and produces normalized dataset rows.
func LoadBeneficiaryDataset(workbookPath string) ([]DatasetRecord, error) {
	file, err := excelize.OpenFile(workbookPath)
	if err != nil {
		return nil, fmt.Errorf("open dataset workbook: %w", err)
	}
	defer file.Close()

	sheets := file.GetSheetList()
	if len(sheets) == 0 {
		return nil, fmt.Errorf("dataset workbook has no sheet")
	}
	sheetName := sheets[0]

	rows, err := file.GetRows(sheetName)
	if err != nil {
		return nil, fmt.Errorf("read dataset rows: %w", err)
	}
	if len(rows) < 2 {
		return nil, nil
	}

	headers := rows[0]
	normalizedHeaders := make([]string, len(headers))
	for idx, label := range headers {
		label = strings.TrimSpace(label)
		normalizedHeaders[idx] = headerMap[label]
	}

	var records []DatasetRecord
	for rowIdx := 1; rowIdx < len(rows); rowIdx++ {
		excelRow := rowIdx + 1
		fields := make(map[string]string)
		var (
			name string
			nik  string
		)

		for colIdx := range headers {
			key := ""
			if colIdx < len(normalizedHeaders) {
				key = normalizedHeaders[colIdx]
			}
			if key == "" {
				continue
			}
			cellRef, err := excelize.CoordinatesToCellName(colIdx+1, excelRow)
			if err != nil {
				return nil, fmt.Errorf("convert coordinates: %w", err)
			}
			raw, err := file.GetCellValue(sheetName, cellRef)
			if err != nil {
				return nil, fmt.Errorf("read cell %s: %w", cellRef, err)
			}
			value := strings.TrimSpace(raw)
			if value == "" {
				continue
			}
			fields[key] = value
			switch key {
			case "name":
				name = value
			case "nik":
				nik = value
			}
		}

		if name == "" || nik == "" {
			continue
		}

		records = append(records, DatasetRecord{
			RowNo:  excelRow,
			Name:   name,
			Nik:    nik,
			Fields: fields,
		})
	}

	return records, nil
}
