import { useMemo, useState } from "react";

import {
  KycFlowProvider,
  useKycFlow,
  ALL_STEPS,
  type StepKey,
} from "@presentation/hooks/useKycFlow";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  IdentityLookupStep,
  KtpCaptureStep,
  OcrReviewStep,
  FaceReviewStep,
  ReviewSubmitStep,
  SelfieCaptureStep,
  LivenessStep,
  DataEntryStep,
  DoneStep,
} from "@presentation/components/OnboardingComponents";
import { toImagePayload } from "@infrastructure/services/ekyc-api";

import { motion, AnimatePresence } from "framer-motion";
import { STEP_LABELS } from "@domain/value-objects/kyc-flow";
import type { Applicant, OcrResult } from "@domain/types";
import { checkBeneficiaryEligibility } from "@infrastructure/services/portal-auth";

export type CompletionPayload = {
  submissionId: string;
  applicant: Applicant;
  faceMatchPassed: boolean;
  livenessPassed: boolean;
};

type OnboardingWizardProps = {
  onComplete?: (payload: CompletionPayload) => void;
  onNavigateLanding?: () => void;
  onLoginShortcut?: () => void;
};

export default function OnboardingWizard({
  onComplete,
  onNavigateLanding,
  onLoginShortcut,
}: OnboardingWizardProps) {
  return (
    <KycFlowProvider>
      <WizardSurface
        onComplete={onComplete}
        onNavigateLanding={onNavigateLanding}
        onLoginShortcut={onLoginShortcut}
      />
    </KycFlowProvider>
  );
}

function WizardSurface({
  onComplete,
  onNavigateLanding,
  onLoginShortcut,
}: OnboardingWizardProps) {
  const { state, dispatch, api } = useKycFlow();
  const {
    step,
    artifacts,
    ocr,
    face,
    live,
    applicantDraft,
    submissionId,
    submitting,
    error,
  } = state;
  const [completion, setCompletion] = useState<CompletionPayload | null>(null);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const stepIndex = ALL_STEPS.indexOf(step);
  const progress = useMemo(
    () => Math.round(((stepIndex + 1) / ALL_STEPS.length) * 100),
    [stepIndex],
  );
  const stepLabel = STEP_LABELS[step];

  const busy = state.syncing;

  const handleIdentityVerify = async ({
    name,
    nik,
  }: {
    name: string;
    nik: string;
  }) => {
    setEligibilityError(null);
    dispatch({ type: "SET_SYNCING", syncing: true });
    dispatch({
      type: "PATCH_APPLICANT",
      patch: { name, number: nik },
    });
    dispatch({
      type: "PATCH_OCR",
      patch: { name, number: nik },
    });
    dispatch({ type: "SET_ERROR", error: undefined });
    try {
      const res = await checkBeneficiaryEligibility({ name, nik });
      if (!res.eligible) {
        const msg =
          res.reason ??
          "Akun sudah terdaftar atau tidak memenuhi kriteria. Silakan login dari halaman landing.";
        setEligibilityError(msg);
        throw new Error(msg);
      }
      if (!res.user?.ID) {
        const msg =
          "Data tidak valid. Mohon kembali ke halaman login dan ulangi verifikasi.";
        setEligibilityError(msg);
        throw new Error(msg);
      }
      setEligibilityError(null);
      const session = await api.createSession(res.user.ID);
      dispatch({ type: "SET_SESSION", session });
      dispatch({ type: "NEXT" });
    } catch (err: any) {
      const msg =
        err?.message ??
        "Tidak dapat memverifikasi data. Silakan kembali ke halaman login.";
      setEligibilityError(msg);
      dispatch({
        type: "SET_ERROR",
        error: msg,
      });
      throw err;
    } finally {
      dispatch({ type: "SET_SYNCING", syncing: false });
    }
  };

  const handleKtpUpload = async (blob: Blob) => {
    if (!state.sessionId) {
      dispatch({
        type: "SET_ERROR",
        error: "Sedang menyiapkan sesi, coba beberapa saat lagi",
      });
      return;
    }
    const file = new File([blob], "ktp.jpg", { type: "image/jpeg" });
    dispatch({ type: "SET_KTP", file });
    dispatch({ type: "SET_SYNCING", syncing: true });
    try {
      await api.uploadIdCard(state.sessionId, file);
      const baseline: OcrResult = {
        confidence: state.ocr?.confidence ?? 0,
        number:
          state.ocr?.number ??
          (state.applicantDraft.number as string | undefined) ??
          "",
        name:
          state.ocr?.name ??
          (state.applicantDraft.name as string | undefined) ??
          "",
        birthDate:
          state.ocr?.birthDate ??
          (state.applicantDraft.birthDate as string | undefined) ??
          "",
        address:
          state.ocr?.address ??
          (state.applicantDraft.address as string | undefined) ??
          "",
      };
      dispatch({ type: "SET_OCR", ocr: baseline });
      dispatch({ type: "SET_ERROR", error: undefined });
      dispatch({ type: "NEXT" });
    } catch (err: any) {
      dispatch({
        type: "SET_ERROR",
        error: err?.message ?? "Gagal mengunggah foto KTP",
      });
    } finally {
      dispatch({ type: "SET_SYNCING", syncing: false });
    }
  };

  const handleSelfieUpload = async (blob: Blob) => {
    if (!state.sessionId) return;
    const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
    dispatch({ type: "SET_SELFIE", file });
    dispatch({ type: "SET_SYNCING", syncing: true });
    try {
      await api.uploadSelfie(state.sessionId, file);
      dispatch({ type: "SET_ERROR", error: undefined });
      dispatch({ type: "NEXT" });
    } catch (err: any) {
      dispatch({
        type: "SET_ERROR",
        error: err?.message ?? "Gagal mengunggah selfie",
      });
    } finally {
      dispatch({ type: "SET_SYNCING", syncing: false });
    }
  };

  const handleLivenessRun = async (gestures: string[]) => {
    if (!state.sessionId || !artifacts.selfieImage) {
      dispatch({
        type: "SET_ERROR",
        error: "Selfie belum tersedia untuk liveness",
      });
      return;
    }
    dispatch({ type: "SET_SYNCING", syncing: true });
    try {
      const baseFrame = await toImagePayload(artifacts.selfieImage);
      const frames =
        gestures.length > 0 ? gestures.map(() => baseFrame) : [baseFrame];
      await api.startLiveness(state.sessionId, frames, gestures);
      dispatch({
        type: "SET_LIVE",
        live: { passed: true, signal: gestures.join(", ") },
      });
      dispatch({ type: "SET_ERROR", error: undefined });
      dispatch({ type: "NEXT" });
    } catch (err: any) {
      dispatch({
        type: "SET_ERROR",
        error: err?.message ?? "Gagal memulai liveness",
      });
    } finally {
      dispatch({ type: "SET_SYNCING", syncing: false });
    }
  };

  const stepContent = (() => {
    switch (step) {
      case "IDENTITY_LOOKUP":
        return (
          <IdentityLookupStep
            initialName={
              state.ocr?.name ?? (applicantDraft.name as string | undefined)
            }
            initialNik={
              state.ocr?.number ?? (applicantDraft.number as string | undefined)
            }
            onVerify={handleIdentityVerify}
            externalError={eligibilityError}
            onRedirectLanding={onLoginShortcut ?? onNavigateLanding}
          />
        );
      case "UPLOAD_KTP":
        return <KtpCaptureStep onCapture={handleKtpUpload} />;
      case "OCR_REVIEW":
        return (
          <OcrReviewStep
            ocr={{
              number: ocr?.number ?? "",
              name: ocr?.name ?? "",
              birthDate: ocr?.birthDate ?? "",
              address: ocr?.address ?? "",
            }}
            ktpImage={artifacts.ktpImage}
            onBack={() => dispatch({ type: "BACK" })}
            onNext={() => dispatch({ type: "NEXT" })}
            dispatch={dispatch}
          />
        );
      case "SELFIE":
        return (
          <SelfieCaptureStep
            onBack={() => dispatch({ type: "BACK" })}
            onCapture={handleSelfieUpload}
          />
        );
      case "FACE_MATCH":
        return (
          <FaceReviewStep
            ktpImage={
              artifacts.ktpImage
                ? URL.createObjectURL(artifacts.ktpImage)
                : undefined
            }
            ktpCropImage={
              artifacts.ktpImage
                ? URL.createObjectURL(artifacts.ktpImage)
                : undefined
            }
            selfieImage={
              artifacts.selfieImage
                ? URL.createObjectURL(artifacts.selfieImage)
                : undefined
            }
            onBackSelfie={() => dispatch({ type: "BACK" })}
            onBackKtp={() => {
              dispatch({ type: "BACK" });
              dispatch({ type: "BACK" });
            }}
            onConfirm={() => dispatch({ type: "NEXT" })}
          />
        );
      case "LIVENESS":
        return (
          <LivenessStep
            onBack={() => dispatch({ type: "BACK" })}
            onRun={handleLivenessRun}
            processing={busy}
          />
        );
      case "DATA_ENTRY":
        return (
          <DataEntryStep
            onBack={() => dispatch({ type: "BACK" })}
            onPatch={(p) => dispatch({ type: "PATCH_APPLICANT", patch: p })}
            onNext={() => dispatch({ type: "NEXT" })}
          />
        );
      case "REVIEW_SUBMIT":
        return (
          <ReviewSubmitStep
            ocr={{
              number: ocr?.number,
              name: ocr?.name,
              birthDate: ocr?.birthDate,
              address: ocr?.address,
            }}
            contact={{
              phone: applicantDraft.phone,
              email: applicantDraft.email,
            }}
            verdict={{
              face: face ? face.score >= (face.threshold ?? 0) : true,
              liveness: live?.passed ?? true,
            }}
            onBack={() => dispatch({ type: "BACK" })}
            onSubmit={async () => {
              try {
                dispatch({ type: "SUBMIT_START" });
                const applicant: Applicant = {
                  number: ocr?.number || "",
                  name: ocr?.name || "",
                  birthDate: ocr?.birthDate || "",
                  address: ocr?.address || "",
                  phone: applicantDraft.phone || "",
                  email: applicantDraft.email || "",
                  pin: applicantDraft.pin,
                };
                if (!applicant.phone || !applicant.pin) {
                  throw new Error(
                    "Nomor HP dan PIN wajib diisi untuk membuat akun.",
                  );
                }
                if (!state.sessionId) {
                  throw new Error("Sesi e-KYC belum siap. Muat ulang halaman.");
                }
                await api.submitApplicant(state.sessionId, {
                  fullName: applicant.name,
                  nik: applicant.number,
                  birthDate: applicant.birthDate,
                  address: applicant.address,
                  phone: applicant.phone,
                  email: applicant.email,
                  pin: applicant.pin,
                });
                dispatch({ type: "SUBMIT_SUCCESS", id: state.sessionId });
                const draft: CompletionPayload = {
                  submissionId: state.sessionId,
                  applicant,
                  faceMatchPassed: face
                    ? face.score >= (face.threshold ?? 0)
                    : true,
                  livenessPassed: live?.passed ?? true,
                };
                setCompletion(draft);
                onComplete?.(draft);
              } catch (e: any) {
                dispatch({
                  type: "SUBMIT_FAIL",
                  error: e?.message ?? "Unknown error",
                });
              }
            }}
            submitting={submitting}
            error={error}
          />
        );
      case "DONE":
        return (
          <DoneStep
            id={submissionId!}
            applicant={completion?.applicant}
            onGoLanding={onNavigateLanding ?? onLoginShortcut}
          />
        );
      default:
        return null;
    }
  })();

  const goToLanding = () => {
    onNavigateLanding?.();
  };

  const goToLogin = () => {
    if (onLoginShortcut) {
      onLoginShortcut();
    } else if (typeof window !== "undefined") {
      window.location.hash = "#landing-login-section";
    }
  };

  return (
    <div className="min-h-screen bg-[var(--light-neutral)] text-[var(--foreground)] flex flex-col relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(45,62,83,0.06),transparent_40%),radial-gradient(circle_at_82%_0%,rgba(45,62,83,0.05),transparent_45%)]" />
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="uppercase tracking-wide text-xs"
              >
                Program Bansos Terpadu
              </Badge>
              <span className="text-xs text-slate-500">
                Dinas Sosial Kabupaten/Kota
              </span>
            </div>
            <h1 className="text-xl font-semibold mt-1">
              Verifikasi Identitas Penerima Bantuan Sosial
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onNavigateLanding}>
              Halaman Awal
            </Button>
            <Button variant="outline" onClick={goToLogin}>
              Sudah pernah daftar? Login sekarang
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full relative p-0 m-0">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <div className="w-full px-4 sm:px-6 lg:px-10 py-8">
            <Card className="w-full rounded-2xl shadow-lg app-card border border-[var(--border)]">
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl text-[var(--deep-navy)]">
                      E-KYC Onboarding
                    </CardTitle>
                    <CardDescription className="text-[var(--muted-gray)]">
                      Verifikasi digital penerima bantuan sosial
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <DarkModeToggle />
                    <Badge
                      variant="secondary"
                      className="rounded-full bg-[var(--accent-emerald)] text-[var(--accent-foreground)]"
                    >
                      {labelFor(step)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {state.error && (
                  <Alert variant="destructive">
                    <AlertDescription>{state.error}</AlertDescription>
                  </Alert>
                )}
                {busy && (
                  <Alert>
                    <AlertDescription>
                      Sedang sinkronisasi dengan server...
                    </AlertDescription>
                  </Alert>
                )}
                {state.session && (
                  <div className="text-sm text-[var(--muted-gray)]">
                    Status proses:{" "}
                    <span className="font-semibold text-[var(--deep-navy)]">
                      {state.session.status}
                    </span>{" "}
                    · Face match: {state.session.faceMatchingStatus} · Liveness:{" "}
                    {state.session.livenessStatus}
                  </div>
                )}

                <section className="space-y-3 border-t border-[var(--border)] pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-gray)]">
                        Tahap {stepIndex + 1} dari {ALL_STEPS.length}
                      </p>
                      <p className="text-2xl font-semibold text-[var(--deep-navy)]">
                        {stepLabel}
                      </p>
                    </div>
                    {step !== "DONE" && (
                      <p className="text-xs text-[var(--muted-gray)] max-w-xs text-right">
                        Proses diverifikasi otomatis di server—tetap ikuti
                        langkah hingga selesai.
                      </p>
                    )}
                  </div>
                  <div className="rounded-full bg-[var(--section-neutral)] p-2 shadow-inner">
                    <Progress
                      value={progress}
                      aria-label={`Progress ${progress}%`}
                    />
                  </div>
                  <Stepper current={state.step} />
                </section>

                <section className="space-y-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="space-y-6"
                    >
                      {stepContent}
                    </motion.div>
                  </AnimatePresence>
                </section>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

function Stepper({ current }: { current: StepKey }) {
  const idx = ALL_STEPS.indexOf(current);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {ALL_STEPS.map((s, i) => (
        <Badge
          key={s}
          variant={i <= idx ? "default" : "secondary"}
          className={`w-full justify-center rounded-2xl ${
            i <= idx
              ? "bg-[var(--accent-emerald)] text-[var(--accent-foreground)]"
              : "bg-[var(--section-neutral)] text-[var(--muted-gray)]"
          }`}
        >
          {i + 1}. {labelFor(s)}
        </Badge>
      ))}
    </div>
  );
}

function labelFor(s: StepKey) {
  return STEP_LABELS[s];
}

function DarkModeToggle() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );
  return (
    <Button
      variant="secondary"
      className="btn-ghost"
      onClick={() => {
        document.documentElement.classList.toggle("dark");
        setDark((d) => !d);
      }}
    >
      {dark ? "🌙" : "☀️"}
    </Button>
  );
}
