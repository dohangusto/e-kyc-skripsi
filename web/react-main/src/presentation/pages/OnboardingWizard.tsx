import { useMemo, useState } from "react";

import { KycFlowProvider, useKycFlow, ALL_STEPS, type StepKey } from "@presentation/hooks/useKycFlow";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
	KtpCaptureStep, 
	OcrReviewStep, 
	FaceReviewStep, 
	ReviewSubmitStep, 
	SelfieCaptureStep, 
	LivenessStep, 
	DataEntryStep,
	DoneStep,
} from "@presentation/components/OnboardingComponents";

import { motion, AnimatePresence } from "framer-motion";
import { STEP_LABELS } from "@domain/value-objects/kyc-flow";
import type { Applicant } from "@domain/types";

export type CompletionPayload = {
  submissionId: string;
  applicant: Applicant;
  faceMatchPassed: boolean;
  livenessPassed: boolean;
};

type OnboardingWizardProps = {
  onComplete?: (payload: CompletionPayload) => void;
};

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  return (
    <KycFlowProvider>
      <WizardSurface onComplete={onComplete} />
    </KycFlowProvider>
  );
}

function WizardSurface({ onComplete }: OnboardingWizardProps) {
  const { state, dispatch, uc } = useKycFlow();
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
  const stepIndex = ALL_STEPS.indexOf(step);
  const progress = useMemo(() => Math.round(((stepIndex + 1) / ALL_STEPS.length) * 100), [stepIndex]);
  const stepLabel = STEP_LABELS[step];

  const stepContent = (() => {
    switch (step) {
      case "UPLOAD_KTP":
        return (
          <KtpCaptureStep
            onCapture={async (blob) => {
              const file = new File([blob], "ktp.jpg", { type: "image/jpeg" });
              dispatch({ type: "SET_KTP", file });
              const ocr = await uc.extractKtp(file);
              dispatch({ type: "SET_OCR", ocr });
              dispatch({ type: "NEXT" });
            }}
          />
        );
      case "OCR_REVIEW":
        return (
          <OcrReviewStep
            ocr={{
              number: ocr?.number ?? "",
              name: ocr?.name ?? "",
              birthDate: ocr?.birthDate ?? "",
              address: ocr?.address ?? "",
            }}
            onBack={() => dispatch({ type: "BACK" })}
            onNext={() => dispatch({ type: "NEXT" })}
            dispatch={dispatch}
          />
        );
      case "SELFIE":
        return (
          <SelfieCaptureStep
            onBack={() => dispatch({ type: "BACK" })}
            onCapture={(blob) => {
              const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
              dispatch({ type: "SET_SELFIE", file });
              dispatch({ type: "NEXT" });
            }}
          />
        );
      case "FACE_MATCH":
        return (
          <FaceReviewStep
            ktpImage={artifacts.ktpImage ? URL.createObjectURL(artifacts.ktpImage) : undefined}
            ktpCropImage={artifacts.ktpImage ? URL.createObjectURL(artifacts.ktpImage) : undefined}
            selfieImage={artifacts.selfieImage ? URL.createObjectURL(artifacts.selfieImage) : undefined}
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
            onResult={(passed, signal) => {
              dispatch({ type: "SET_LIVE", live: { passed, signal } });
              dispatch({ type: "NEXT" });
            }}
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
            contact={{ phone: applicantDraft.phone, email: applicantDraft.email }}
            verdict={{
              face: !!face ? face.score >= (face.threshold ?? 0) : true,
              liveness: !!live?.passed,
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
                };
                const res = await uc.submitKyc(applicant, artifacts);
                dispatch({ type: "SUBMIT_SUCCESS", id: res.id });
                const draft: CompletionPayload = {
                  submissionId: res.id,
                  applicant,
                  faceMatchPassed: !!face ? face.score >= (face.threshold ?? 0) : true,
                  livenessPassed: !!live?.passed,
                };
                setCompletion(draft);
                onComplete?.(draft);
              } catch (e: any) {
                dispatch({ type: "SUBMIT_FAIL", error: e?.message ?? "Unknown error" });
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
          />
        );
      default:
        return null;
    }
  })();

  return (
    <main className="max-w-4xl mx-auto p-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="rounded-2xl shadow-xl">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">E-KYC Onboarding</CardTitle>
                <CardDescription>Verifikasi digital penerima bantuan sosial</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <DarkModeToggle />
                <Badge variant="secondary" className="rounded-full">{labelFor(step)}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Tahap {stepIndex + 1} dari {ALL_STEPS.length}
                  </p>
                  <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{stepLabel}</p>
                </div>
                {step !== "DONE" && (
                  <p className="text-xs text-slate-500 max-w-xs text-right">
                    Belum selesai? Tutup halaman kapan saja—progress dan hasil OCR tersimpan otomatis untuk dilanjutkan kemudian.
                  </p>
                )}
              </div>
              <Progress value={progress} aria-label={`Progress ${progress}%`} />
              <Stepper current={state.step} />
            </section>

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
          </CardContent>
        </Card>
      </motion.div>
    </main>
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
          className="w-full justify-center rounded-2xl"
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

function DarkModeToggle(){
  const [dark,setDark]=useState(() => document.documentElement.classList.contains('dark'));
  return (
    <Button variant="secondary" onClick={()=>{ document.documentElement.classList.toggle('dark'); setDark(d=>!d); }}>
      {dark ? '🌙' : '☀️'}
    </Button>
  );
}
