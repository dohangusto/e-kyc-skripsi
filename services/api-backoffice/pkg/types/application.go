package types

// ApplicationSummary is a trimmed down projection returned by the API layers
// for both the citizen and backoffice front-ends. Extend as real data sources
// become available.
type ApplicationSummary struct {
	ID            string `json:"id"`
	ApplicantName string `json:"applicantName"`
	Status        string `json:"status"`
}
