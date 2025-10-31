import { useEffect, useMemo, useRef, useState } from "react";
import { useKycFlow, ALL_STEPS, type StepKey } from "@presentation/hooks/useKycFlow";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, IdCard, Camera, ScanFace, ShieldCheck, Check, User2, AlertTriangle, Repeat } from "lucide-react";
import { motion } from "framer-motion";

import { cameraManager } from "@/shared/utils";

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
              <Badge variant="secondary" className="rounded-full">{labelFor(state.step)}</Badge>
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
				  cameraManager.stopAll();
                  dispatch({ type: "NEXT" });
                }}
              />
            )}

            {/* 2) OCR_REVIEW → present nicely, not JSON */}
            {state.step === "OCR_REVIEW" && (
              <OcrReviewStep
                data={{
                  number: state.ocr?.number ?? "",
                  name: state.ocr?.name ?? "",
                  birthDate: state.ocr?.birthDate ?? "",
                  address: state.ocr?.address ?? "",
                }}
                onBack={() => dispatch({ type: "BACK" })}
                onNext={() => dispatch({ type: "NEXT" })}
              />
            )}

            {/* 3) SELFIE → camera with oval guide, holding KTP */}
            {state.step === "SELFIE" && (
              <SelfieCaptureStep
                onBack={() => dispatch({ type: "BACK" })}
                onCapture={(blob) => {
                  const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
                  dispatch({ type: "SET_SELFIE", file });
				  cameraManager.stopAll();
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
				  cameraManager.stopAll();
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
					cameraManager.stopAll();
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

function Section({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        {desc && <CardDescription>{desc}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

/**************************
 * 1) KTP CAMERA CAPTURE
 **************************/
function KtpCaptureStep({ onCapture }: { onCapture: (blob: Blob) => void }) {
  return (
    <Section icon={<IdCard className="w-5 h-5" />} title="Ambil Foto KTP" desc="Posisikan KTP di dalam frame. Hindari glare & blur.">
      <CameraCapture
        variant="ktp"
        onCapture={onCapture}
      />
      <Alert>
        <AlertTitle>Tips</AlertTitle>
        <AlertDescription>Letakkan KTP di permukaan datar, pencahayaan merata, dan hindari pantulan cahaya.</AlertDescription>
      </Alert>
    </Section>
  );
}

/**************************
 * 2) REVIEW OCR (pretty)
 **************************/
function OcrReviewStep({ data, onBack, onNext }: { data: { number: string; name: string; birthDate: string; address: string; }; onBack: () => void; onNext: () => void; }) {
  return (
    <Section icon={<IdCard className="w-5 h-5" />} title="Review Data KTP" desc="Periksa hasil OCR. Jika salah, bisa koreksi nanti di Data Tambahan.">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="NIK" value={data.number} />
        <Field label="Nama" value={data.name} />
        <Field label="Tanggal Lahir" value={data.birthDate} />
        <Field label="Alamat" value={data.address} className="md:col-span-2" />
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onBack}>Kembali</Button>
        <Button onClick={onNext}><Check className="w-4 h-4 mr-2" /> Lanjut</Button>
      </div>
    </Section>
  );
}

function Field({ label, value, className }: { label: string; value?: string; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs text-slate-500">{label}</Label>
      <div className="p-2 rounded border bg-white text-sm">{value || "-"}</div>
    </div>
  );
}

/****************************************
 * 3) SELFIE CAMERA with Oval Guide
 ****************************************/
function SelfieCaptureStep({ onBack, onCapture }: { onBack: () => void; onCapture: (blob: Blob) => void }) {
  return (
    <Section icon={<Camera className="w-5 h-5" />} title="Selfie sambil memegang KTP" desc="Posisikan wajah di dalam oval guide dan pegang KTP dengan jelas.">
      <CameraCapture variant="selfie" onCapture={onCapture} />
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onBack}>Kembali</Button>
      </div>
    </Section>
  );
}

/****************************************
 * 4) FACE REVIEW (no score)
 ****************************************/
function FaceReviewStep({ ktpImage, ktpCropImage, selfieImage, onBackSelfie, onBackKtp, onConfirm }: { ktpImage?: string; ktpCropImage?: string; selfieImage?: string; onBackSelfie: () => void; onBackKtp: () => void; onConfirm: () => void; }) {
  return (
    <Section icon={<ScanFace className="w-5 h-5" />} title="Komparasi Wajah" desc="Pastikan foto selfie dan pas foto KTP tampak sama orangnya.">
      <div className="grid md:grid-cols-3 gap-4 items-start">
        <PreviewBox title="Selfie" src={selfieImage} />
        <PreviewBox title="Pas Foto (crop KTP)" src={ktpCropImage} />
        <PreviewBox title="KTP (asli)" src={ktpImage} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onBackSelfie}><Repeat className="w-4 h-4 mr-2"/>Ulangi Selfie</Button>
        <Button variant="secondary" onClick={onBackKtp}><Repeat className="w-4 h-4 mr-2"/>Ulangi KTP</Button>
        <Button onClick={onConfirm}><Check className="w-4 h-4 mr-2"/>Sudah Sesuai</Button>
      </div>
    </Section>
  );
}

function PreviewBox({ title, src }: { title: string; src?: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>
        {src ? (
          <img src={src} alt={title} className="w-full rounded-lg border object-contain max-h-64 bg-slate-50" />
        ) : (
          <div className="text-sm text-slate-500">Belum ada gambar</div>
        )}
      </CardContent>
    </Card>
  );
}

/****************************************
 * 5) LIVENESS CAMERA + INSTRUCTIONS (dummy)
 ****************************************/
const GESTURES = ["Kedipkan mata", "Tengok kiri", "Tengok kanan", "Angguk", "Geleng", "Maju-mundur kepala"] as const;

function LivenessStep({ onBack, onResult }: { onBack: () => void; onResult: (passed: boolean, signal: string) => void }) {
  const [current, setCurrent] = useState<string | null>(null);
  const [queue, setQueue] = useState<string[]>(() => shuffle([...GESTURES]).slice(0, 3));
  const [running, setRunning] = useState(false);

  async function start() {
    setRunning(true);
    for (const g of queue) {
      setCurrent(g);
      await sleep(1500);
    }
    setRunning(false);
    onResult(true, queue.join(", "));
  }

  return (
    <Section icon={<ShieldCheck className="w-5 h-5" />} title="Liveness Detection" desc="Ikuti instruksi gestur secara berurutan.">
      <CameraCapture variant="selfie" liveOnly />
      <div className="p-3 rounded bg-slate-50 border">
        <p className="text-sm mb-2"><strong>Instruksi:</strong> {current ?? "—"}</p>
        <div className="flex gap-2 flex-wrap">
          {queue.map((q, i) => (
            <Badge key={q} variant={current === q ? "default" : "secondary"} className="rounded-full">{i+1}. {q}</Badge>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onBack}>Kembali</Button>
        <Button onClick={start} disabled={running}>{running ? "Memproses..." : "Mulai"}</Button>
      </div>
    </Section>
  );
}

/****************************************
 * 6) DATA ENTRY (unchanged)
 ****************************************/
function DataEntryStep({ onBack, onPatch, onNext }: { onBack: () => void; onPatch: (p: any) => void; onNext: () => void }) {
  return (
    <Section icon={<User2 className="w-5 h-5" />} title="Data Tambahan" desc="Lengkapi kontak untuk proses verifikasi.">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Nomor HP</Label>
          <Input placeholder="08xxxxxxxxxx" onChange={(e) => onPatch({ phone: e.target.value })} />
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" placeholder="nama@domain.com" onChange={(e) => onPatch({ email: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <Label>Alamat (opsional)</Label>
          <Textarea placeholder="Sesuai KTP, RT/RW, Kel/Desa, Kec, Kota/Kab" onChange={(e) => onPatch({ address: e.target.value })} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onBack}>Kembali</Button>
        <Button onClick={onNext}>Lanjut</Button>
      </div>
    </Section>
  );
}

/****************************************
 * 7) REVIEW & SUBMIT (pretty, boolean verdicts)
 ****************************************/
function ReviewSubmitStep({ ocr, contact, verdict, onBack, onSubmit, submitting, error }: { ocr: any; contact: any; verdict: { face: boolean; liveness: boolean }; onBack: () => void; onSubmit: () => void; submitting: boolean; error?: string }) {
  return (
    <Section icon={<Check className="w-5 h-5" />} title="Review & Submit" desc="Pastikan semua data sesuai.">
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Identitas (OCR)</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row k="NIK" v={ocr.number} />
            <Row k="Nama" v={ocr.name} />
            <Row k="Tanggal Lahir" v={ocr.birthDate} />
            <Row k="Alamat" v={ocr.address} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Kontak</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row k="HP" v={contact.phone} />
            <Row k="Email" v={contact.email} />
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">Hasil Otomatis</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <Verdict title="Kecocokan Wajah" ok={verdict.face} okText="Wajah antara KTP dan selfie sesuai" badText="Maaf, wajah antara KTP dan selfie tidak sesuai, silakan coba lagi" />
            <Verdict title="Liveness" ok={verdict.liveness} okText="Gestur diikuti" badText="Gestur tidak sesuai" />
          </CardContent>
        </Card>
      </div>
      {error && (
        <Alert className="border-red-300">
          <AlertTitle>Submit gagal</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onBack}>Kembali</Button>
        <Button onClick={onSubmit}>{submitting ? "Mengirim..." : "Kirim Verifikasi"}</Button>
      </div>
    </Section>
  );
}

function Row({ k, v }: { k: string; v?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500">{k}</span>
      <span className="font-medium">{v || "-"}</span>
    </div>
  );
}

function Verdict({ title, ok, okText, badText }: { title: string; ok: boolean; okText: string; badText: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>
        {ok ? (
          <div className="px-3 py-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">✅ {okText}</div>
        ) : (
          <div className="px-3 py-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">❌ {badText}</div>
        )}
      </CardContent>
    </Card>
  );
}

/****************************************
 * 8) DONE
 ****************************************/
function DoneStep({ id }: { id: string }) {
  return (
    <div className="text-center space-y-2 py-8">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100">
        <Check className="w-8 h-8" />
      </div>
      <h3 className="text-2xl font-semibold">Verifikasi Terkirim</h3>
      <p className="text-slate-600">ID Pengajuan: {id}</p>
    </div>
  );
}

/****************************************
 * CAMERA COMPONENT (shared)
 ****************************************/
function CameraCapture({
  variant,          // "ktp" | "selfie"
  onCapture,        // dipakai di KTP & Selfie (sekali foto)
  liveOnly,         // true untuk Liveness (stream terus)
}: {
  variant: "ktp" | "selfie";
  onCapture?: (blob: Blob) => void;
  liveOnly?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: variant === "ktp" ? { ideal: "environment" } : { ideal: "user" },
            width: { ideal: 1280 }, height: { ideal: 720 },
          },
          audio: false,
        };
        const s = await navigator.mediaDevices.getUserMedia(constraints);
        if (!mounted) {
          s.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = s;
        cameraManager.register(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play();
        }
      } catch (e: any) {
        setError(e?.message ?? "Tidak dapat mengakses kamera");
      }
    })();

    // stop stream saat komponen unmount / ganti variant
    return () => {
      mounted = false;
      if (streamRef.current) {
        cameraManager.unregister(streamRef.current);
        streamRef.current = null;
      }
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  async function handleCapture() {
    if (!videoRef.current || !canvasRef.current || !onCapture) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const W = video.videoWidth; const H = video.videoHeight;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, W, H);

    const blob = await new Promise<Blob>((res) =>
      canvas.toBlob((b) => res(b!), "image/jpeg", 0.9)
    );
    const url = URL.createObjectURL(blob);
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(url);
    onCapture(blob);

    // kalau bukan live streaming, matikan kamera langsung setelah capture
    if (!liveOnly && streamRef.current) {
      cameraManager.unregister(streamRef.current);
      streamRef.current = null;
    }
  }

  function handleStop() {
    if (streamRef.current) {
      cameraManager.unregister(streamRef.current);
      streamRef.current = null;
    }
  }

  return (
    <div className="w-full">
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        {variant === "ktp" ? <KtpOverlay /> : <SelfieOverlay />}
      </div>

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      {!liveOnly ? (
        <div className="flex gap-2 mt-3">
          <Button onClick={handleCapture}>Capture</Button>
          <Button variant="secondary" onClick={handleStop}>Lepaskan Kamera</Button>
          {capturedUrl && <img src={capturedUrl} alt="preview" className="h-16 rounded border" />}
        </div>
      ) : (
        <div className="flex gap-2 mt-3">
          <Button variant="secondary" onClick={handleStop}>Lepaskan Kamera</Button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}


function KtpOverlay() {
  // 85.6 × 54 mm → aspect ≈ 1.586
  return (
    <div className="absolute inset-0 grid place-items-center pointer-events-none">
      <div className="relative w-[80%] aspect-[1.586] rounded-md border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
    </div>
  );
}

function SelfieOverlay() {
  return (
    <div className="absolute inset-0 grid place-items-center pointer-events-none">
      <div className="relative w-[55%] aspect-square rounded-full border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
    </div>
  );
}

/**************** helpers ****************/
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
