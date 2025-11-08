package types

type ApplicationSummary struct {
	ID            string `json:"id"`
	ApplicantName string `json:"applicantName"`
	Status        string `json:"status"`
}
