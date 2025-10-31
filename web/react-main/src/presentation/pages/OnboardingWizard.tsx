import { useMemo, useState } from "react";

import { useKycFlow, ALL_STEPS, type StepKey } from "@presentation/hooks/useKycFlow";
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

import { motion } from "framer-motion";


export default function OnboardingWizard() {
  const { state, dispatch, uc } = useKycFlow();
  const progress = useMemo(() => Math.round(((ALL_STEPS.indexOf(state.step) + 1) / ALL_STEPS.length) * 100), [state.step]);

  return (
    <main className="max-w-4xl mx-auto p-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="rounded-2xl shadow-xl">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">E-KYC Onboarding</CardTitle>
                <CardDescription>Camera-first • Clean Architecture • shadcn/ui</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <DarkModeToggle />
                <Badge variant="secondary" className="rounded-full">{labelFor(state.step)}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Stepper current={state.step} />
            <Progress value={progress} />

            {/* 1) UPLOAD_KTP → now camera capture with KTP frame */}
            {state.step === "UPLOAD_KTP" && (
              <KtpCaptureStep
                onCapture={async (blob) => {
                  const file = new File([blob], "ktp.jpg", { type: "image/jpeg" });
                  dispatch({ type: "SET_KTP", file });
                  const ocr = await uc.extractKtp(file);
                  dispatch({ type: "SET_OCR", ocr });
                  dispatch({ type: "NEXT" });
                }}
              />
            )}

            {/* 2) OCR_REVIEW → present nicely, not JSON */}
            {state.step === "OCR_REVIEW" && (
              <OcrReviewStep
                ocr={{
                  number: state.ocr?.number ?? "",
                  name: state.ocr?.name ?? "",
                  birthDate: state.ocr?.birthDate ?? "",
                  address: state.ocr?.address ?? "",
                }}
                onBack={() => dispatch({ type: "BACK" })}
                onNext={() => dispatch({ type: "NEXT" })}
				dispatch={dispatch}
              />
            )}

            {/* 3) SELFIE → camera with oval guide, holding KTP */}
            {state.step === "SELFIE" && (
              <SelfieCaptureStep
                onBack={() => dispatch({ type: "BACK" })}
                onCapture={(blob) => {
                  const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
                  dispatch({ type: "SET_SELFIE", file });
                  dispatch({ type: "NEXT" });
                }}
              />
            )}

            {/* 4) FACE_MATCH → review/comparison only (no scores) */}
            {state.step === "FACE_MATCH" && (
              <FaceReviewStep
                ktpImage={state.artifacts.ktpImage ? URL.createObjectURL(state.artifacts.ktpImage) : undefined}
                // Dummy "pas foto" crop — backend will provide real crop later
                ktpCropImage={state.artifacts.ktpImage ? URL.createObjectURL(state.artifacts.ktpImage) : undefined}
                selfieImage={state.artifacts.selfieImage ? URL.createObjectURL(state.artifacts.selfieImage) : undefined}
                onBackSelfie={() => dispatch({ type: "BACK" })}
                onBackKtp={() => { dispatch({ type: "BACK" }); dispatch({ type: "BACK" }); }}
                onConfirm={() => dispatch({ type: "NEXT" })}
              />
            )}

            {/* 5) LIVENESS → camera streaming + instruction (dummy) */}
            {state.step === "LIVENESS" && (
              <LivenessStep
                onBack={() => dispatch({ type: "BACK" })}
                onResult={(passed, signal) => {
                  dispatch({ type: "SET_LIVE", live: { passed, signal } });
                  dispatch({ type: "NEXT" });
                }}
              />
            )}

            {/* 6) DATA_ENTRY → unchanged (already good) */}
            {state.step === "DATA_ENTRY" && (
              <DataEntryStep
                onBack={() => dispatch({ type: "BACK" })}
                onPatch={(p) => dispatch({ type: "PATCH_APPLICANT", patch: p })}
                onNext={() => dispatch({ type: "NEXT" })}
              />
            )}

            {/* 7) REVIEW_SUBMIT → pretty summary, boolean results */}
            {state.step === "REVIEW_SUBMIT" && (
              <ReviewSubmitStep
                ocr={{ number: state.ocr?.number, name: state.ocr?.name, birthDate: state.ocr?.birthDate, address: state.ocr?.address }}
                contact={{ phone: state.applicantDraft.phone, email: state.applicantDraft.email }}
                verdict={{
                  face: !!state.face ? state.face.score >= (state.face.threshold ?? 0) : true /* hide score; assume ok if existed */,
                  liveness: !!state.live?.passed,
                }}
                onBack={() => dispatch({ type: "BACK" })}
                onSubmit={async () => {
                  try {
                    dispatch({ type: "SUBMIT_START" });
                    const applicant = {
                      number: state.ocr?.number || "",
                      name: state.ocr?.name || "",
                      birthDate: state.ocr?.birthDate || "",
                      address: state.ocr?.address || "",
                      phone: state.applicantDraft.phone || "",
                      email: state.applicantDraft.email || "",
                    };
                    const res = await uc.submitKyc(applicant as any, state.artifacts);
                    dispatch({ type: "SUBMIT_SUCCESS", id: res.id });
                  } catch (e: any) {
                    dispatch({ type: "SUBMIT_FAIL", error: e?.message ?? "Unknown error" });
                  }
                }}
                submitting={state.submitting}
                error={state.error}
              />
            )}

            {/* 8) DONE */}
            {state.step === "DONE" && (
              <DoneStep id={state.submissionId!} />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}

function Stepper({ current }: { current: StepKey }) {
  const idx = ALL_STEPS.indexOf(current);
  return (
    <div className="flex flex-wrap gap-2">
      {ALL_STEPS.map((s, i) => (
        <Badge key={s} variant={i <= idx ? "default" : "secondary"} className="rounded-2xl">
          {i + 1}. {labelFor(s)}
        </Badge>
      ))}
    </div>
  );
}

function labelFor(s: StepKey) {
  switch (s) {
    case "UPLOAD_KTP": return "Kamera KTP";
    case "OCR_REVIEW": return "Review OCR";
    case "SELFIE": return "Selfie + Pegang KTP";
    case "FACE_MATCH": return "Komparasi";
    case "LIVENESS": return "Liveness";
    case "DATA_ENTRY": return "Data Tambahan";
    case "REVIEW_SUBMIT": return "Review & Submit";
    case "DONE": return "Selesai";
  }
}

function DarkModeToggle(){
  const [dark,setDark]=useState(() => document.documentElement.classList.contains('dark'));
  return (
    <Button variant="secondary" onClick={()=>{ document.documentElement.classList.toggle('dark'); setDark(d=>!d); }}>
      {dark ? '🌙' : '☀️'}
    </Button>
  );
}