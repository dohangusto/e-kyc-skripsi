import { useState } from "react";

import LandingPage from "@presentation/pages/LandingPage";
import OnboardingWizard, { type CompletionPayload } from "@presentation/pages/OnboardingWizard";
import DashboardPage from "@presentation/pages/DashboardPage";

type ViewState = "landing" | "wizard" | "dashboard";

const App = () => {
  const [view, setView] = useState<ViewState>("landing");
  const [dashboardData, setDashboardData] = useState<CompletionPayload | null>(null);

  const handleStart = () => setView("wizard");
  const handleComplete = (payload: CompletionPayload) => {
    setDashboardData(payload);
    setView("dashboard");
  };
  const handleViewDashboard = () => {
    if (dashboardData) setView("dashboard");
  };
  const handleStartNew = () => {
    setView("wizard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {view === "landing" && (
        <LandingPage
          onStart={handleStart}
          hasSubmission={!!dashboardData}
          onViewDashboard={dashboardData ? handleViewDashboard : undefined}
        />
      )}
      {view === "wizard" && (
        <OnboardingWizard onComplete={handleComplete} />
      )}
      {view === "dashboard" && dashboardData && (
        <DashboardPage
          data={{
            submissionId: dashboardData.submissionId,
            applicant: dashboardData.applicant,
            verificationStatus: "SEDANG_DITINJAU",
            faceMatchPassed: dashboardData.faceMatchPassed,
            livenessPassed: dashboardData.livenessPassed,
            submittedAt: new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }),
          }}
          onStartNew={handleStartNew}
        />
      )}
    </div>
  );
};

export default App;
