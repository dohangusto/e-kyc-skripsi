import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* *************************************
 * CAMERA COMPONENT (shared) — Manual capture only
 * Quality indicators: Brightness, Sharpness, Stability
 * NO auto-capture, NO countdown
 ************************************* */

export type CaptureProps = {
  variant: "ktp" | "selfie";
  onCapture?: (blob: Blob) => void;
  liveOnly?: boolean;
};

export function CameraCapture({
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
  const [selectedDeviceId, setSelectedDeviceId] = useState<
    string | undefined
  >();
  const [bright, setBright] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [hasStream, setHasStream] = useState(false);
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
      setHasStream(true);

      return s;
    } catch (e: any) {
      if (e?.name === "AbortError") return null; // normal saat switch cepat
      setError(
        e?.message ||
          "Tidak dapat mengakses kamera. Klik 'Nyalakan Kamera' lalu izinkan akses.",
      );
      setHasStream(false);
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

  async function handleStartCamera() {
    setError(null);
    setStarting(true);
    try {
      await startStream({
        facingMode: selectedDeviceId
          ? undefined
          : variant === "ktp"
            ? { ideal: "environment" }
            : { ideal: "user" },
        deviceId: selectedDeviceId,
      });
    } finally {
      setStarting(false);
    }
  }

  // ---------------------------
  // Capture
  // ---------------------------
  async function handleCapture() {
    if (!videoRef.current || !onCapture) return;
    if (!hasStream) {
      setError("Kamera belum aktif. Klik 'Nyalakan Kamera' lalu coba lagi.");
      return;
    }
    const video = videoRef.current;
    const off = document.createElement("canvas");
    off.width = video.videoWidth;
    off.height = video.videoHeight;
    const ctx = off.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const blob = await new Promise<Blob>((res) =>
      off.toBlob((b) => res(b!), "image/jpeg", 0.9),
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
  const showErr = !!error;

  return (
    <div className="w-full">
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
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
          onChange={(e) => setSelectedDeviceId(e.target.value || undefined)}
        >
          {!devices.length && <option value="">(Tidak ada kamera)</option>}
          {devices.map((d, idx) => (
            <option key={d.deviceId || idx} value={d.deviceId}>
              {d.label || `Kamera ${idx + 1}`}
            </option>
          ))}
        </select>

        <Button onClick={handleStartCamera} disabled={starting}>
          {starting ? "Mengaktifkan..." : "Nyalakan Kamera"}
        </Button>

        {!liveOnly && (
          <>
            <Button onClick={handleCapture} disabled={!hasStream}>
              Capture
            </Button>
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

export function QualityBadges({
  status,
  selfie,
}: {
  status: { bright: boolean; sharp: boolean; still: boolean };
  selfie?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Badge variant={status.bright ? "default" : "secondary"}>
        Brightness {status.bright ? "OK" : "Low"}
      </Badge>
      <Badge variant={status.sharp ? "default" : "secondary"}>
        Sharpness {status.sharp ? "OK" : "Blur"}
      </Badge>
      {!selfie && (
        <Badge variant={status.still ? "default" : "secondary"}>
          Stability {status.still ? "OK" : "Move"}
        </Badge>
      )}
    </div>
  );
}

export function KtpOverlay({ ok }: { ok: boolean }) {
  return (
    <div className="absolute inset-0 grid place-items-center pointer-events-none">
      <div
        className={
          "relative w-[80%] aspect-[1.586] rounded-md border-2 " +
          (ok
            ? "border-emerald-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
            : "border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]")
        }
      >
        <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-current"></div>
        <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-current"></div>
        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-current"></div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-current"></div>
      </div>
    </div>
  );
}

export function SelfieOverlay({ ok }: { ok: boolean }) {
  return (
    <div className="absolute inset-0 grid place-items-center pointer-events-none">
      <div
        className={
          "relative w-[55%] aspect-square rounded-full border-4 " +
          (ok ? "border-emerald-400" : "border-white/90")
        }
      ></div>
    </div>
  );
}
