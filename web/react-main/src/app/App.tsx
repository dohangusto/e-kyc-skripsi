import { useEffect, useRef, useState } from "react";

import LandingPage, {
  LANDING_LOGIN_SECTION_ID,
} from "@presentation/pages/LandingPage";
import OnboardingWizard, {
  type CompletionPayload,
} from "@presentation/pages/OnboardingWizard";
import DashboardPage from "@presentation/pages/DashboardPage";
import SurveyPage from "@presentation/pages/SurveyPage";
import { LocalAuthRepository } from "@infrastructure/adapters/local-auth";
import { SessionStorage } from "@infrastructure/adapters/session-storage";
import {
  fetchActiveSession,
  loginBeneficiary,
  listEkycSessions,
  type AuthResultResponse,
  type EkycSessionResponse,
} from "@infrastructure/services/portal-auth";
import {
  fetchPortalSurvey,
  savePortalSurveyDraft,
  submitPortalSurvey,
  type PortalSurveyResponse,
} from "@infrastructure/services/portal-survey";
import { fetchPortalBatches } from "@infrastructure/services/portal-batches";
import {
  fetchPortalDistributions,
  type PortalDistributionResponse,
} from "@infrastructure/services/portal-distributions";
import type {
  Account,
  SurveyAnswers,
  SurveyStatus,
} from "@domain/entities/account";
import type { Applicant } from "@domain/types";
import type { PortalBatch } from "@domain/entities/batch";
import { PIN_FLAG } from "@shared/security";

const sanitizeApplicant = (applicant: Applicant): Applicant => {
  const { pin: _ignored, ...rest } = applicant;
  return rest as Applicant;
};

const sanitizeAccount = (account: Account): Account => {
  return {
    ...account,
    pin: account.pin ? PIN_FLAG : null,
    applicant: sanitizeApplicant(account.applicant),
  };
};

function ensureSurvey(account: Account): Account {
  const sanitized = sanitizeAccount(account);
  const survey = sanitized.survey ?? {
    completed: false,
    status: "belum-dikumpulkan",
  };
  return {
    ...sanitized,
    survey: {
      completed: survey.completed ?? false,
      status: survey.status ?? "belum-dikumpulkan",
      submittedAt: survey.submittedAt,
      answers: survey.answers,
    },
  };
}

type ViewState = "landing" | "wizard" | "dashboard" | "survey";
type OtpContext = {
  phone: string;
  code: string;
  createdAt: number;
};

type SessionPayload = {
  token: string;
  phone: string;
  expiresAt: number;
  remote: boolean;
  userId?: string;
  role?: string;
  regionScope?: string[];
};

type ApplicantMetadata = {
  name?: string;
  nik?: string;
  number?: string;
  birthDate?: string;
  address?: string;
  phone?: string;
  email?: string;
  userId?: string;
};

const toIsoDate = (input?: string | null) => {
  if (!input) return "";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const deriveVerificationStatus = (
  decision?: string | null,
): Account["verificationStatus"] => {
  const normalized = (decision ?? "").toUpperCase();
  if (normalized === "APPROVED") return "DISETUJUI";
  if (normalized === "REJECTED") return "DITOLAK";
  return "SEDANG_DITINJAU";
};

const detectPassFromSignals = (
  overall?: string | null,
  status?: string | null,
) => {
  const normalized = (overall ?? "").toUpperCase();
  if (normalized === "PASS") return true;
  if (normalized === "FAIL") return false;
  const statusText = (status ?? "").toUpperCase();
  if (statusText === "FAILED") return false;
  if (statusText === "DONE") return true;
  return true;
};

const buildAccountFromSession = (
  session: EkycSessionResponse,
  user: AuthResultResponse["user"],
  pin: string,
): Account => {
  const applicantMeta =
    (session.metadata?.applicant as ApplicantMetadata | undefined) ?? {};
  const phone = applicantMeta.phone ?? user.Phone ?? "";
  const applicant: Applicant = {
    number:
      applicantMeta.number ?? applicantMeta.nik ?? user.NIK ?? session.id ?? "",
    name: applicantMeta.name ?? user.Name ?? "",
    birthDate: applicantMeta.birthDate ?? toIsoDate(user.DOB) ?? toIsoDate(),
    address: applicantMeta.address ?? "",
    phone,
    email: applicantMeta.email ?? user.Email ?? "",
  };

  return {
    phone,
    pin: pin ? PIN_FLAG : null,
    submissionId: session.id,
    applicant,
    createdAt: session.createdAt ?? new Date().toISOString(),
    faceMatchPassed: detectPassFromSignals(
      session.faceMatchOverall,
      session.faceMatchingStatus,
    ),
    livenessPassed: detectPassFromSignals(
      session.livenessOverall,
      session.livenessStatus,
    ),
    verificationStatus: deriveVerificationStatus(session.finalDecision),
  };
};

const mapDistributionsToSchedules = (
  dists: PortalDistributionResponse[] | null | undefined,
) => {
  if (!dists || dists.length === 0) return undefined;
  return dists.map((dist) => ({
    id: dist.id,
    title: dist.name,
    date: new Date(dist.scheduled_at).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    location: dist.location,
    note: dist.notes ?? undefined,
    status: dist.status as "PLANNED" | "IN_PROGRESS" | "COMPLETED" | undefined,
    channel: dist.channel,
    batchCodes: dist.batch_codes ?? [],
    updatedAt: dist.updated_at
      ? new Date(dist.updated_at).toLocaleString("id-ID", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : undefined,
  }));
};

const findLatestSessionForUser = async (
  userId: string,
  normalizedPhone: string,
) => {
  const sessions = await listEkycSessions(400);
  const matches = sessions.filter((session) => {
    const meta =
      (session.metadata?.applicant as ApplicantMetadata | undefined) ?? {};
    if (session.userId && session.userId === userId) {
      return true;
    }
    if (meta.userId && meta.userId === userId) {
      return true;
    }
    const metaPhone = meta.phone?.replace(/\D/g, "");
    if (metaPhone && normalizedPhone && metaPhone === normalizedPhone) {
      return true;
    }
    return false;
  });
  if (!matches.length) {
    return null;
  }
  matches.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  return matches[0];
};

const mergePortalSurvey = (
  account: Account,
  survey?: PortalSurveyResponse | null,
): Account => {
  if (!survey) {
    return ensureSurvey(account);
  }
  const normalizedStatus =
    (survey.status as SurveyStatus) ?? "belum-dikumpulkan";
  return ensureSurvey({
    ...account,
    survey: {
      completed: survey.completed ?? false,
      status: normalizedStatus,
      submittedAt: survey.submittedAt ?? undefined,
      answers: survey.answers as SurveyAnswers | undefined,
    },
  });
};

const fetchAccountFromGateway = async (
  phone: string,
  pin: string,
): Promise<{ account: Account; session: SessionPayload }> => {
  const auth = await loginBeneficiary({ phone, pin });
  const session = await findLatestSessionForUser(auth.user.ID, phone);
  if (!session) {
    throw new Error(
      "Belum ditemukan pengajuan e-KYC untuk nomor ini. Selesaikan verifikasi terlebih dahulu.",
    );
  }
  let account = buildAccountFromSession(session, auth.user, pin);
  try {
    const remoteSurvey = await fetchPortalSurvey(
      session.id,
      auth.session.token,
    );
    account = mergePortalSurvey(account, remoteSurvey);
  } catch (err) {
    console.error("Failed to load survey from gateway", err);
  }
  const issuedAt = new Date(auth.session.issuedAt).getTime();
  const parsedExpires = new Date(auth.session.expiresAt).getTime();
  const fallbackDuration = 48 * 60 * 60 * 1000;
  const expiresAt = Number.isNaN(parsedExpires)
    ? (Number.isNaN(issuedAt) ? Date.now() : issuedAt) + fallbackDuration
    : parsedExpires;
  return {
    account,
    session: {
      token: auth.session.token,
      phone: account.phone,
      expiresAt,
      remote: true,
      userId: auth.session.userId,
      role: auth.session.role,
      regionScope: auth.session.regionScope,
    },
  };
};

const createEphemeralSession = (phone: string): SessionPayload => {
  const token =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    token,
    phone,
    expiresAt: Date.now() + 6 * 60 * 60 * 1000,
    remote: false,
  };
};

const persistRemoteSession = (payload: SessionPayload | null) => {
  if (payload?.remote) {
    SessionStorage.save({
      token: payload.token,
      phone: payload.phone,
      expiresAt: payload.expiresAt,
      userId: payload.userId,
      role: payload.role,
      regionScope: payload.regionScope,
    });
  } else {
    SessionStorage.clear();
  }
};

const App = () => {
  const [view, setView] = useState<ViewState>("landing");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [pinLoginError, setPinLoginError] = useState<string | null>(null);
  const [otpContext, setOtpContext] = useState<OtpContext | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [surveyMode, setSurveyMode] = useState<"fill" | "review">("fill");
  const [portalBatches, setPortalBatches] = useState<PortalBatch[] | null>(
    null,
  );
  const [portalDistributions, setPortalDistributions] = useState<
    Awaited<ReturnType<typeof fetchPortalDistributions>>
  >([]);
  const syncedSurveyIdsRef = useRef<Record<string, boolean>>({});
  const [restoredSession, setRestoredSession] = useState(false);
  const landingLoginHash = `#${LANDING_LOGIN_SECTION_ID}`;

  const scrollLoginSectionIfVisible = () => {
    if (typeof document === "undefined") return;
    const el = document.getElementById(LANDING_LOGIN_SECTION_ID);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goToLanding = () => {
    if (typeof window !== "undefined") {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
    setView("landing");
  };

  const goToLandingLogin = () => {
    if (view === "landing") {
      scrollLoginSectionIfVisible();
      return;
    }
    if (typeof window !== "undefined") {
      window.location.hash = landingLoginHash;
    }
    setView("landing");
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const loadedAccounts = await LocalAuthRepository.loadAccounts();
      if (!mounted) return;

      setAccounts(loadedAccounts.map(ensureSurvey));
      setAccountsLoaded(true);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const normalizePhone = (phone: string) => phone.replace(/\D/g, "");

  const replaceAccount = (next: Account) => {
    const ensured = ensureSurvey(next);
    setAccounts((prev) => {
      const normalized = normalizePhone(ensured.phone);
      const rest = prev
        .filter((acc) => normalizePhone(acc.phone) !== normalized)
        .map(ensureSurvey);
      const updated = [ensured, ...rest];
      LocalAuthRepository.saveAccounts(updated);
      return updated;
    });
    setCurrentAccount(ensured);
  };

  const shouldSyncSurvey = (account: Account | null) => {
    if (!account || !session?.remote) return false;
    if (!session.token || session.expiresAt < Date.now()) return false;
    return normalizePhone(session.phone) === normalizePhone(account.phone);
  };

  useEffect(() => {
    if (!accountsLoaded || restoredSession) {
      return;
    }
    let cancelled = false;
    (async () => {
      const stored = SessionStorage.load();
      if (!stored) {
        if (!cancelled) {
          setRestoredSession(true);
        }
        return;
      }
      if (stored.expiresAt <= Date.now()) {
        persistRemoteSession(null);
        if (!cancelled) {
          setRestoredSession(true);
        }
        return;
      }
      try {
        const remoteSession = await fetchActiveSession(stored.token);
        if (cancelled) return;
        const expiresAt = new Date(
          remoteSession.expiresAt ?? remoteSession.issuedAt,
        ).getTime();
        const hydratedSession: SessionPayload = {
          token: stored.token,
          phone: stored.phone,
          expiresAt: Number.isNaN(expiresAt) ? stored.expiresAt : expiresAt,
          remote: true,
          userId: remoteSession.userId,
          role: remoteSession.role,
          regionScope: remoteSession.regionScope,
        };
        setSession(hydratedSession);
        persistRemoteSession(hydratedSession);
        const normalized = normalizePhone(stored.phone);
        const matched = accounts.find(
          (acc) => normalizePhone(acc.phone) === normalized,
        );
        if (matched && !currentAccount) {
          setCurrentAccount(matched);
          setSurveyMode(matched.survey?.completed ? "review" : "fill");
          setView((prev) => (prev === "landing" ? "dashboard" : prev));
        }
      } catch (err) {
        console.error("Failed to restore session from storage", err);
        persistRemoteSession(null);
      } finally {
        if (!cancelled) {
          setRestoredSession(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountsLoaded, restoredSession, accounts, currentAccount]);

  const handleStart = () => {
    setPinLoginError(null);
    setOtpError(null);
    setView("wizard");
  };

  useEffect(() => {
    if (!currentAccount || !shouldSyncSurvey(currentAccount)) {
      return;
    }
    const submissionId = currentAccount.submissionId;
    if (!submissionId || syncedSurveyIdsRef.current[submissionId]) {
      return;
    }
    syncedSurveyIdsRef.current[submissionId] = true;
    (async () => {
      try {
        const remote = await fetchPortalSurvey(submissionId, session?.token);
        if (remote) {
          replaceAccount(mergePortalSurvey(currentAccount, remote));
        }
      } catch (err) {
        console.error("Failed to refresh survey from portal", err);
        delete syncedSurveyIdsRef.current[submissionId];
      }
    })();
  }, [currentAccount, session?.token]);

  useEffect(() => {
    if (!session?.remote || !session.token || !currentAccount?.submissionId) {
      setPortalBatches(null);
      setPortalDistributions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchPortalBatches(
          currentAccount.submissionId,
          session.token,
        );
        const dists = await fetchPortalDistributions(
          currentAccount.submissionId,
          session.token,
        );
        if (!cancelled) {
          setPortalBatches(data);
          setPortalDistributions(dists);
        }
      } catch (err) {
        console.error("Failed to fetch portal batches", err);
        if (!cancelled) {
          setPortalBatches([]);
          setPortalDistributions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    session?.remote,
    session?.token,
    session?.userId,
    currentAccount?.submissionId,
  ]);

  useEffect(() => {
    if (!session?.remote) {
      return;
    }
    const msRemaining = session.expiresAt - Date.now();
    if (msRemaining <= 0) {
      persistRemoteSession(null);
      setSession(null);
      return;
    }
    const timer = window.setTimeout(() => {
      persistRemoteSession(null);
      setSession((prev) => {
        if (!prev?.remote) return prev;
        return null;
      });
    }, msRemaining);
    return () => {
      window.clearTimeout(timer);
    };
  }, [session]);

  const handleComplete = (payload: CompletionPayload) => {
    const phone = normalizePhone(payload.applicant.phone);
    if (!phone) {
      setPinLoginError(
        "Nomor HP belum diisi. Mohon lengkapi saat verifikasi ulang.",
      );
      setView("landing");
      return;
    }

    setPinLoginError(
      "Verifikasi selesai. Silakan login kembali dengan nomor HP dan PIN baru Anda.",
    );
    setOtpError(null);
    setOtpContext(null);
    setSession(null);
    persistRemoteSession(null);
  };

  const handleViewDashboard = () => {
    setPinLoginError(null);
    setOtpError(null);

    if (currentAccount) {
      setView("dashboard");
      return;
    }

    const fallback = accounts.find((acc) => !acc.pin) ?? accounts[0];

    if (fallback) {
      setCurrentAccount(fallback);
      setOtpContext(null);
      if (
        !session ||
        normalizePhone(session.phone) !== normalizePhone(fallback.phone)
      ) {
        const newSession = createEphemeralSession(fallback.phone);
        setSession(newSession);
        persistRemoteSession(null);
      }
      setSurveyMode(fallback.survey?.completed ? "review" : "fill");
      setView("dashboard");
    }
  };

  const handleStartNew = () => {
    setPinLoginError(null);
    setOtpError(null);
    setOtpContext(null);
    setCurrentAccount(null);
    setView("wizard");
    persistRemoteSession(null);
  };

  const handlePinLogin = async (credentials: {
    phone: string;
    pin: string;
  }) => {
    const phone = normalizePhone(credentials.phone);
    setPinLoginError(null);
    setOtpError(null);
    setOtpContext(null);

    try {
      const { account, session: remoteSession } = await fetchAccountFromGateway(
        phone,
        credentials.pin,
      );
      const accountWithSurvey = ensureSurvey(account);
      replaceAccount(accountWithSurvey);
      setSession(remoteSession);
      persistRemoteSession(remoteSession);
      setSurveyMode(accountWithSurvey.survey?.completed ? "review" : "fill");
      setView("dashboard");
      return;
    } catch (err: any) {
      setPinLoginError(err?.message ?? "Gagal login. Coba lagi sebentar.");
      return;
    }
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
      setOtpError(
        "Nomor HP belum terdaftar. Silakan lakukan verifikasi terlebih dahulu.",
      );
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

    const accountWithSurvey = account.survey
      ? ensureSurvey(account)
      : ensureSurvey({ ...account, survey: { completed: false } });
    replaceAccount(accountWithSurvey);
    const newSession = createEphemeralSession(account.phone);
    setSession(newSession);
    persistRemoteSession(null);
    setSurveyMode(accountWithSurvey.survey?.completed ? "review" : "fill");
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
    persistRemoteSession(null);
    setSurveyMode("fill");
    setPortalBatches(null);
    syncedSurveyIdsRef.current = {};
  };

  const handlePinSetup = async (pin: string) => {
    if (!currentAccount) {
      throw new Error("Akun tidak ditemukan. Silakan masuk kembali.");
    }

    const normalized = pin.trim();
    if (!/^\d{6}$/.test(normalized)) {
      throw new Error("PIN harus 6 digit angka.");
    }

    const updatedAccount: Account = { ...currentAccount, pin: PIN_FLAG };
    replaceAccount(updatedAccount);
    setPinLoginError(null);
    setOtpContext(null);
    setOtpError(null);
    if (!session?.remote) {
      const newSession = createEphemeralSession(updatedAccount.phone);
      setSession(newSession);
      persistRemoteSession(null);
    }
    setSurveyMode(updatedAccount.survey?.completed ? "review" : "fill");
  };

  const handleStartSurvey = () => {
    if (!currentAccount) return;
    if (!currentAccount.survey) {
      const updatedAccount = ensureSurvey({
        ...currentAccount,
        survey: { completed: false },
      } as Account);
      replaceAccount(updatedAccount);
      setSurveyMode("fill");
      setView("survey");
      return;
    }
    setSurveyMode(currentAccount.survey?.completed ? "review" : "fill");
    setView("survey");
  };

  const handleSurveyComplete = async (
    answers: SurveyAnswers,
    status: SurveyStatus = "antrean",
  ) => {
    if (!currentAccount) return;
    const submittedAt = new Date().toISOString();
    const updatedAccount: Account = {
      ...currentAccount,
      survey: {
        completed: true,
        submittedAt,
        answers,
        status,
      },
    };
    replaceAccount(updatedAccount);
    if (shouldSyncSurvey(updatedAccount)) {
      try {
        const remote = await submitPortalSurvey(
          updatedAccount.submissionId,
          { answers, status },
          session?.token,
        );
        if (remote) {
          replaceAccount(mergePortalSurvey(updatedAccount, remote));
        }
      } catch (err) {
        console.error("Failed to submit survey", err);
      }
    }
    setSurveyMode("review");
    setView("dashboard");
    if (!session?.remote) {
      const newSession = createEphemeralSession(updatedAccount.phone);
      setSession(newSession);
      persistRemoteSession(null);
    }
  };

  const handleSurveyDraft = async (
    answers: SurveyAnswers,
    stayOnSurvey = false,
  ) => {
    if (!currentAccount) return;
    const status = currentAccount.survey?.status ?? "belum-dikumpulkan";
    const updatedAccount: Account = ensureSurvey({
      ...currentAccount,
      survey: {
        completed: false,
        submittedAt: currentAccount.survey?.submittedAt,
        answers,
        status,
      },
    });
    replaceAccount(updatedAccount);
    if (shouldSyncSurvey(updatedAccount)) {
      try {
        const remote = await savePortalSurveyDraft(
          updatedAccount.submissionId,
          { answers, status },
          session?.token,
        );
        if (remote) {
          replaceAccount(mergePortalSurvey(updatedAccount, remote));
        }
      } catch (err) {
        console.error("Failed to save survey draft", err);
      }
    }
    setSurveyMode("fill");
    if (!stayOnSurvey) {
      setView("dashboard");
    }
  };

  const handleViewSurvey = () => {
    if (!currentAccount?.survey?.answers) return;
    setSurveyMode("review");
    setView("survey");
  };

  const otpInfo = otpContext
    ? { phone: otpContext.phone, code: otpContext.code }
    : null;
  const canAccessDashboard =
    !!currentAccount || !!session || accounts.some((acc) => !acc.pin);

  return (
    <div className="min-h-screen bg-[var(--light-neutral)] text-[var(--foreground)] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(45,62,83,0.08),transparent_40%),radial-gradient(circle_at_82%_0%,rgba(45,62,83,0.06),transparent_45%)]" />
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
        <OnboardingWizard
          onComplete={handleComplete}
          onNavigateLanding={goToLanding}
          onLoginShortcut={goToLandingLogin}
        />
      )}
      {view === "dashboard" && currentAccount && (
        <DashboardPage
          data={{
            submissionId: currentAccount.submissionId,
            applicant: currentAccount.applicant,
            verificationStatus: currentAccount.verificationStatus,
            faceMatchPassed: currentAccount.faceMatchPassed,
            livenessPassed: currentAccount.livenessPassed,
            submittedAt: new Date(currentAccount.createdAt).toLocaleDateString(
              "id-ID",
              {
                day: "2-digit",
                month: "long",
                year: "numeric",
              },
            ),
            pinSet: !!currentAccount.pin,
            surveyCompleted: currentAccount.survey?.completed ?? false,
            surveyStatus: currentAccount.survey?.status ?? "belum-dikumpulkan",
            surveySubmittedAt: currentAccount.survey?.submittedAt
              ? new Date(currentAccount.survey.submittedAt).toLocaleString(
                  "id-ID",
                  {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )
              : undefined,
            hasSurveyDraft:
              !!currentAccount.survey?.answers &&
              !currentAccount.survey?.completed,
            batches: portalBatches ?? undefined,
            schedules: mapDistributionsToSchedules(portalDistributions),
          }}
          onStartNew={handleStartNew}
          onLogout={handleLogout}
          onCreatePin={handlePinSetup}
          onStartSurvey={handleStartSurvey}
          onContinueSurvey={handleStartSurvey}
          onViewSurvey={
            currentAccount.survey?.completed ? handleViewSurvey : undefined
          }
        />
      )}
      {view === "survey" && currentAccount && (
        <SurveyPage
          applicant={currentAccount.applicant}
          existingAnswers={currentAccount.survey?.answers}
          mode={surveyMode}
          status={currentAccount.survey?.status ?? "belum-dikumpulkan"}
          onCancel={(draft) => {
            if (draft) {
              handleSurveyDraft(draft);
            } else {
              setView("dashboard");
            }
          }}
          onSaveDraft={(draft) => handleSurveyDraft(draft, true)}
          onSubmit={handleSurveyComplete}
        />
      )}
    </div>
  );
};

export default App;
