import { useEffect, useState } from "react";

import LandingPage from "@presentation/pages/LandingPage";
import OnboardingWizard, { type CompletionPayload } from "@presentation/pages/OnboardingWizard";
import DashboardPage from "@presentation/pages/DashboardPage";
import SurveyPage from "@presentation/pages/SurveyPage";
import { LocalAuthRepository } from "@infrastructure/adapters/local-auth";
import type { Account, SurveyAnswers } from "@domain/entities/account";
import { createSession, clearSession, loadSession, type SessionPayload } from "@shared/session";

type ViewState = "landing" | "wizard" | "dashboard" | "survey";
type OtpContext = {
  phone: string;
  code: string;
  createdAt: number;
};

const App = () => {
  const [view, setView] = useState<ViewState>("landing");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [pinLoginError, setPinLoginError] = useState<string | null>(null);
  const [otpContext, setOtpContext] = useState<OtpContext | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionPayload | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const loadedAccounts = await LocalAuthRepository.loadAccounts();
      if (!mounted) return;
      setAccounts(loadedAccounts);

      const storedSession = loadSession();
      if (!storedSession) return;

      const account = loadedAccounts.find(
        (acc) => normalizePhone(acc.phone) === normalizePhone(storedSession.phone)
      );
      if (!account) {
        clearSession();
        return;
      }

      const accountWithSurvey = account.survey ? account : { ...account, survey: { completed: false } };
      if (!account.survey) {
        const nextAccounts = loadedAccounts.map((acc) =>
          normalizePhone(acc.phone) === normalizePhone(accountWithSurvey.phone) ? accountWithSurvey : acc
        );
        setAccounts(nextAccounts);
        LocalAuthRepository.saveAccounts(nextAccounts);
      }

      setSession(storedSession);
      setCurrentAccount(accountWithSurvey);
      setView("dashboard");
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const normalizePhone = (phone: string) => phone.replace(/\D/g, "");

  const handleStart = () => {
    setPinLoginError(null);
    setOtpError(null);
    setView("wizard");
  };

  const handleComplete = (payload: CompletionPayload) => {
    const phone = normalizePhone(payload.applicant.phone);
    if (!phone) {
      setPinLoginError("Nomor HP belum diisi. Mohon lengkapi saat verifikasi ulang.");
      setView("landing");
      return;
    }

    const existing = accounts.find((acc) => normalizePhone(acc.phone) === phone);
    const account: Account = {
      phone,
      pin: existing?.pin ?? null,
      submissionId: payload.submissionId,
      applicant: { ...payload.applicant, phone },
      createdAt: new Date().toISOString(),
      faceMatchPassed: payload.faceMatchPassed,
      livenessPassed: payload.livenessPassed,
      verificationStatus: "SEDANG_DITINJAU",
      survey: existing?.survey ?? { completed: false },
    };

    const nextAccounts = [
      account,
      ...accounts.filter((acc) => normalizePhone(acc.phone) !== phone),
    ];

    setAccounts(nextAccounts);
    setCurrentAccount(account);
    setPinLoginError(null);
    setOtpError(null);
    setOtpContext(null);
    const newSession = createSession(phone);
    setSession(newSession);
    setView("dashboard");
    LocalAuthRepository.saveAccounts(nextAccounts);
  };

  const handleViewDashboard = () => {
    setPinLoginError(null);
    setOtpError(null);

    if (currentAccount) {
      setView("dashboard");
      return;
    }

    const fallback =
      accounts.find((acc) => !acc.pin) ?? accounts[0];

    if (fallback) {
      setCurrentAccount(fallback);
      setOtpContext(null);
      if (!session || normalizePhone(session.phone) !== normalizePhone(fallback.phone)) {
        const newSession = createSession(fallback.phone);
        setSession(newSession);
      }
      setView("dashboard");
    }
  };

  const handleStartNew = () => {
    setPinLoginError(null);
    setOtpError(null);
    setOtpContext(null);
    setCurrentAccount(null);
    setView("wizard");
  };

  const handlePinLogin = (credentials: { phone: string; pin: string }) => {
    const phone = normalizePhone(credentials.phone);
    const account = accounts.find((acc) => normalizePhone(acc.phone) === phone);

    if (!account) {
      setPinLoginError("Nomor HP belum terdaftar. Silakan lakukan verifikasi terlebih dahulu.");
      return;
    }

    if (!account.pin) {
      setPinLoginError("PIN belum dibuat. Gunakan opsi OTP atau masuk ke dashboard untuk membuat PIN.");
      return;
    }

    if (account.pin !== credentials.pin) {
      setPinLoginError("Nomor HP atau PIN tidak sesuai.");
      return;
    }

    const accountWithSurvey = account.survey ? account : { ...account, survey: { completed: false } };
    if (!account.survey) {
      const nextAccounts = accounts.map((acc) =>
        normalizePhone(acc.phone) === phone ? accountWithSurvey : acc
      );
      setAccounts(nextAccounts);
      LocalAuthRepository.saveAccounts(nextAccounts);
    }
    setCurrentAccount(accountWithSurvey);
    const newSession = createSession(account.phone);
    setSession(newSession);
    setView("dashboard");
    setPinLoginError(null);
    setOtpError(null);
    setOtpContext(null);
  };

  const handleRequestOtp = (phoneRaw: string) => {
    const phone = normalizePhone(phoneRaw);

    if (!phone) {
      setOtpError("Masukkan nomor HP terlebih dahulu.");
      setOtpContext(null);
      return null;
    }

    const account = accounts.find((acc) => normalizePhone(acc.phone) === phone);
    if (!account) {
      setOtpError("Nomor HP belum terdaftar. Silakan lakukan verifikasi terlebih dahulu.");
      setOtpContext(null);
      return null;
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    setOtpContext({ phone, code, createdAt: Date.now() });
    setOtpError(null);
    setPinLoginError(null);
    return { phone, code };
  };

  const handleVerifyOtp = (payload: { phone: string; code: string }) => {
    const phone = normalizePhone(payload.phone);

    if (!otpContext || otpContext.phone !== phone) {
      setOtpError("Silakan kirim OTP terlebih dahulu.");
      return;
    }

    if (Date.now() - otpContext.createdAt > 5 * 60 * 1000) {
      setOtpError("OTP sudah kedaluwarsa. Kirim ulang kode.");
      return;
    }

    if (otpContext.code !== payload.code) {
      setOtpError("Kode OTP tidak sesuai.");
      return;
    }

    const account = accounts.find((acc) => normalizePhone(acc.phone) === phone);
    if (!account) {
      setOtpError("Nomor HP belum terdaftar.");
      return;
    }

    const accountWithSurvey = account.survey ? account : { ...account, survey: { completed: false } };
    if (!account.survey) {
      const nextAccounts = accounts.map((acc) =>
        normalizePhone(acc.phone) === phone ? accountWithSurvey : acc
      );
      setAccounts(nextAccounts);
      LocalAuthRepository.saveAccounts(nextAccounts);
    }
    setCurrentAccount(accountWithSurvey);
    const newSession = createSession(account.phone);
    setSession(newSession);
    setView("dashboard");
    setPinLoginError(null);
    setOtpError(null);
    setOtpContext(null);
  };

  const handleLogout = () => {
    setCurrentAccount(null);
    setView("landing");
    setPinLoginError(null);
    setOtpContext(null);
    setOtpError(null);
    setSession(null);
    clearSession();
  };

  const handlePinSetup = async (pin: string) => {
    if (!currentAccount) {
      throw new Error("Akun tidak ditemukan. Silakan masuk kembali.");
    }

    const normalized = pin.trim();
    if (!/^\d{6}$/.test(normalized)) {
      throw new Error("PIN harus 6 digit angka.");
    }

    const updatedAccount: Account = { ...currentAccount, pin: normalized };
    const nextAccounts = accounts.map((acc) =>
      normalizePhone(acc.phone) === normalizePhone(updatedAccount.phone) ? updatedAccount : acc
    );
    setAccounts(nextAccounts);
    setCurrentAccount(updatedAccount);
    await LocalAuthRepository.saveAccounts(nextAccounts);
    setPinLoginError(null);
    setOtpContext(null);
    setOtpError(null);
    const newSession = createSession(updatedAccount.phone);
    setSession(newSession);
  };

  const handleStartSurvey = () => {
    if (!currentAccount) return;
    if (!currentAccount.survey) {
      const updatedAccount = { ...currentAccount, survey: { completed: false } } as Account;
      const nextAccounts = accounts.map((acc) =>
        normalizePhone(acc.phone) === normalizePhone(updatedAccount.phone) ? updatedAccount : acc
      );
      setAccounts(nextAccounts);
      setCurrentAccount(updatedAccount);
      LocalAuthRepository.saveAccounts(nextAccounts);
    }
    setView("survey");
  };

  const handleSurveyComplete = async (answers: SurveyAnswers) => {
    if (!currentAccount) return;
    const updatedAccount: Account = {
      ...currentAccount,
      survey: {
        completed: true,
        submittedAt: new Date().toISOString(),
        answers,
      },
    };
    const nextAccounts = accounts.map((acc) =>
      normalizePhone(acc.phone) === normalizePhone(updatedAccount.phone) ? updatedAccount : acc
    );
    setAccounts(nextAccounts);
    setCurrentAccount(updatedAccount);
    await LocalAuthRepository.saveAccounts(nextAccounts);
    setView("dashboard");
    const newSession = createSession(updatedAccount.phone);
    setSession(newSession);
  };

  const otpInfo = otpContext ? { phone: otpContext.phone, code: otpContext.code } : null;
  const canAccessDashboard = !!currentAccount || !!session || accounts.some((acc) => !acc.pin);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {view === "landing" && (
        <LandingPage
          onStart={handleStart}
          hasSubmission={accounts.length > 0}
          onViewDashboard={handleViewDashboard}
          onLogin={handlePinLogin}
          pinError={pinLoginError}
          canAccessDashboard={canAccessDashboard}
          onRequestOtp={handleRequestOtp}
          onVerifyOtp={handleVerifyOtp}
          otpError={otpError}
          otpInfo={otpInfo}
        />
      )}
      {view === "wizard" && (
        <OnboardingWizard onComplete={handleComplete} />
      )}
      {view === "dashboard" && currentAccount && (
        <DashboardPage
          data={{
            submissionId: currentAccount.submissionId,
            applicant: currentAccount.applicant,
            verificationStatus: currentAccount.verificationStatus,
            faceMatchPassed: currentAccount.faceMatchPassed,
            livenessPassed: currentAccount.livenessPassed,
            submittedAt: new Date(currentAccount.createdAt).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            }),
            pinSet: !!currentAccount.pin,
            surveyCompleted: currentAccount.survey?.completed ?? false,
          }}
          onStartNew={handleStartNew}
          onLogout={handleLogout}
          onCreatePin={handlePinSetup}
          onStartSurvey={handleStartSurvey}
        />
      )}
      {view === "survey" && currentAccount && (
        <SurveyPage
          applicant={currentAccount.applicant}
          existingAnswers={currentAccount.survey?.answers}
          onCancel={() => setView("dashboard")}
          onSubmit={handleSurveyComplete}
        />
      )}
    </div>
  );
};

export default App;
