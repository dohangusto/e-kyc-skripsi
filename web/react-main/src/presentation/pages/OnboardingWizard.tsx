// === INSTALL STEPS (already shared before) ===
// npm i lucide-react framer-motion
// npx shadcn@latest init
// npx shadcn@latest add button card input textarea label badge progress alert
// Tailwind v4 (Opsi A) already set.

// ========= Revised Wizard (camera-first, better reviews) =========
// File: src/presentation/pages/OnboardingWizard.tsx

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
    <Section
      icon={<IdCard className="w-5 h-5" />}
      title="Ambil Foto KTP"
      desc="Posisikan KTP di dalam frame. Silahkan capture saat KTP stabil, terang, dan tajam."
    >
      <CameraCapture variant="ktp" onCapture={onCapture} />
      <Alert>
        <AlertTitle>Tips</AlertTitle>
        <AlertDescription>
          Letakkan KTP di permukaan datar, pencahayaan merata, hindari pantulan. Ikon reticle akan hijau saat kondisi bagus.
        </AlertDescription>
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
    <Section
      icon={<Camera className="w-5 h-5" />}
      title="Selfie + Pegang KTP"
      desc="Posisikan wajah di dalam oval guide. Pastikan dalam kondisi terang, dan kamera stabil."
    >
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
/* *************************************
 * CAMERA COMPONENT (shared) — Manual capture only
 * Quality indicators: Brightness, Sharpness, Stability
 * NO auto-capture, NO countdown
 ************************************* */

const cameraManager = {
  streams: new Set<MediaStream>(),
  register(s: MediaStream) { this.streams.add(s); },
  unregister(s?: MediaStream | null) { if (!s) return; s.getTracks().forEach(t => t.stop()); this.streams.delete(s); },
  stopAll() { this.streams.forEach(s => s.getTracks().forEach(t => t.stop())); this.streams.clear(); },
};

type CaptureProps = {
  variant: "ktp" | "selfie";
  onCapture?: (blob: Blob) => void;
  liveOnly?: boolean;
};

function CameraCapture({
  variant,
  onCapture,
  liveOnly,
}: {
  variant: "ktp" | "selfie";
  onCapture?: (blob: Blob) => void;
  liveOnly?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const startSeq = useRef(0);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>();
  const [bright, setBright] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);

  // ---------------------------
  // Stream helpers
  // ---------------------------
  function stopRaf() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }

  async function pauseAndDetach(video?: HTMLVideoElement | null) {
    if (!video) return;
    try {
      await video.pause();
    } catch {}
    (video as any).srcObject = null;
    video.removeAttribute("src");
  }

  function stopStream(s?: MediaStream | null) {
    const st = s ?? streamRef.current;
    if (st) st.getTracks().forEach((t) => t.stop());
    if (!s) streamRef.current = null;
  }

  async function attachStream(video: HTMLVideoElement, stream: MediaStream) {
    (video as any).srcObject = stream;
    // tunggu metadata sebelum play agar stabil di Safari/Chrome
    await new Promise<void>((res) => {
      if (video.readyState >= 1) return res(); // HAVE_METADATA
      const onMeta = () => {
        video.removeEventListener("loadedmetadata", onMeta);
        res();
      };
      video.addEventListener("loadedmetadata", onMeta);
    });
    try {
      await video.play();
    } catch (e: any) {
      // abaikan warning Chrome saat switch cepat
      if (!/AbortError|NotAllowedError/.test(e?.name || "")) throw e;
    }
  }

  async function startStream(opts: { deviceId?: string; facingMode?: any }) {
    stopRaf();
    const video = videoRef.current;
    const mySeq = ++startSeq.current;

    await pauseAndDetach(video);
    stopStream();

    const constraints: MediaStreamConstraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        ...(opts.deviceId ? { deviceId: { exact: opts.deviceId } } : {}),
        ...(opts.facingMode ? { facingMode: opts.facingMode } : {}),
      },
      audio: false,
    };

    try {
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      if (mySeq !== startSeq.current) {
        s.getTracks().forEach((t) => t.stop());
        return null;
      }

      streamRef.current = s;
      if (video) await attachStream(video, s);
      startBrightnessLoop();

      return s;
    } catch (e: any) {
      if (e?.name === "AbortError") return null; // normal saat switch cepat
      setError(e?.message ?? "Tidak dapat mengakses kamera");
      return null;
    }
  }

  // ---------------------------
  // Brightness monitor
  // ---------------------------
  function startBrightnessLoop() {
    stopRaf();
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c) return;

      c.width = 64;
      c.height = 48;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, c.width, c.height);
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      let sum = 0;
      for (let i = 0; i < data.length; i += 4)
        sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
      const avg = sum / (data.length / 4);
      setBright(avg > 50);
    };
    loop();
  }

  // ---------------------------
  // Lifecycle
  // ---------------------------
  useEffect(() => {
    let mounted = true;
    (async () => {
      const s = await startStream({
        facingMode: selectedDeviceId
          ? undefined
          : variant === "ktp"
          ? { ideal: "environment" }
          : { ideal: "user" },
        deviceId: selectedDeviceId,
      });
      if (!mounted && s) s.getTracks().forEach((t) => t.stop());

      const ds = await navigator.mediaDevices.enumerateDevices();
      setDevices(ds.filter((d) => d.kind === "videoinput"));
    })();

    return () => {
      mounted = false;
      stopRaf();
      pauseAndDetach(videoRef.current);
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  useEffect(() => {
    if (!selectedDeviceId) return;
    startStream({ deviceId: selectedDeviceId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeviceId]);

  // ---------------------------
  // Capture
  // ---------------------------
  async function handleCapture() {
    if (!videoRef.current || !onCapture) return;
    const video = videoRef.current;
    const off = document.createElement("canvas");
    off.width = video.videoWidth;
    off.height = video.videoHeight;
    const ctx = off.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const blob = await new Promise<Blob>((res) =>
      off.toBlob((b) => res(b!), "image/jpeg", 0.9)
    );
    const url = URL.createObjectURL(blob);
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(url);
    onCapture(blob);
  }

  function handleStop() {
    stopRaf();
    pauseAndDetach(videoRef.current);
    stopStream();
  }

  // ---------------------------
  // Render
  // ---------------------------
  const showErr = error && !/aborted|interrupted/i.test(String(error));

  return (
    <div className="w-full">
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${
            variant === "selfie" ? "-scale-x-100" : ""
          }`}
          playsInline
          muted
        />
        {variant === "ktp" ? (
          <KtpOverlay ok={bright} />
        ) : (
          <SelfieOverlay ok={bright} />
        )}
      </div>

      {showErr && <p className="text-sm text-red-600 mt-2">{error}</p>}

      <div className="flex flex-wrap items-center gap-2 mt-3">
        <label className="text-sm text-slate-600">Kamera:</label>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={selectedDeviceId ?? ""}
          onChange={(e) =>
            setSelectedDeviceId(e.target.value || undefined)
          }
        >
          {!devices.length && <option value="">(Tidak ada kamera)</option>}
          {devices.map((d, idx) => (
            <option key={d.deviceId || idx} value={d.deviceId}>
              {d.label || `Kamera ${idx + 1}`}
            </option>
          ))}
        </select>

        {!liveOnly && (
          <>
            <Button onClick={handleCapture}>Capture</Button>
            <Button variant="secondary" onClick={handleStop}>
              Lepaskan Kamera
            </Button>
          </>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}


function QualityBadges({ status, selfie }: { status: {bright:boolean; sharp:boolean; still:boolean}; selfie?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Badge variant={status.bright ? "default" : "secondary"}>Brightness {status.bright ? "OK" : "Low"}</Badge>
      <Badge variant={status.sharp ? "default" : "secondary"}>Sharpness {status.sharp ? "OK" : "Blur"}</Badge>
      {!selfie && <Badge variant={status.still ? "default" : "secondary"}>Stability {status.still ? "OK" : "Move"}</Badge>}
    </div>
  );
}

function KtpOverlay({ ok }: { ok: boolean }) {
  return (
    <div className="absolute inset-0 grid place-items-center pointer-events-none">
      <div className={"relative w-[80%] aspect-[1.586] rounded-md border-2 " + (ok ? "border-emerald-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" : "border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]") }>
        <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-current"></div>
        <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-current"></div>
        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-current"></div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-current"></div>
      </div>
    </div>
  );
}

function SelfieOverlay({ ok }: { ok: boolean }) {
  return (
    <div className="absolute inset-0 grid place-items-center pointer-events-none">
      <div className={"relative w-[55%] aspect-square rounded-full border-4 " + (ok ? "border-emerald-400" : "border-white/90")}></div>
    </div>
  );
}

/**************** helpers ****************/
function estimateBrightness(img: ImageData) {
  const d = img.data; let sum = 0; const n = d.length/4;
  for (let i=0;i<d.length;i+=4){ sum += 0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2]; }
  return (sum/n)/2.55; // ≈ 0..100
}
function estimateSharpness(img: ImageData) {
  const { data, width, height } = img; let acc = 0; let count = 0;
  for (let y=1;y<height-1;y+=2){ for (let x=1;x<width-1;x+=2){
    const gx = grayAt(data,width,x+1,y) - grayAt(data,width,x-1,y);
    const gy = grayAt(data,width,x,y+1) - grayAt(data,width,x,y-1);
    acc += Math.sqrt(gx*gx+gy*gy); count++;
  }}
  return acc / (count||1) / 4; // higher = sharper
}
function estimateMotion(img: ImageData) {
  if (!(estimateMotion as any).prev) { (estimateMotion as any).prev = img; return 999; }
  const prev: ImageData = (estimateMotion as any).prev; (estimateMotion as any).prev = img;
  const { data, width, height } = img; const p = prev.data;
  let acc = 0; let n = 0;
  for (let y=0;y<height;y+=3){ for (let x=0;x<width;x+=3){
    const i = (y*width + x)*4;
    const g = 0.2126*data[i] + 0.7152*data[i+1] + 0.0722*data[i+2];
    const h = 0.2126*p[i] + 0.7152*p[i+1] + 0.0722*p[i+2];
    acc += Math.abs(g-h); n++;
  }}
  return acc/(n||1)/2.55; // 0..100 (lower = more stable)
}
function grayAt(d: Uint8ClampedArray, w: number, x: number, y: number){
  const i=(y*w+x)*4; return 0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2];
}

function shuffle<T>(arr: T[]): T[] { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function DarkModeToggle(){
  const [dark,setDark]=useState(() => document.documentElement.classList.contains('dark'));
  return (
    <Button variant="secondary" onClick={()=>{ document.documentElement.classList.toggle('dark'); setDark(d=>!d); }}>
      {dark ? '🌙' : '☀️'}
    </Button>
  );
}
