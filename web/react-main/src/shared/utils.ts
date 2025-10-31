export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export const cameraManager = {
  streams: new Set<MediaStream>(),
  register(s: MediaStream) { this.streams.add(s); },
  unregister(s?: MediaStream | null) { if (!s) return; s.getTracks().forEach(t => t.stop()); this.streams.delete(s); },
  stopAll() { this.streams.forEach(s => s.getTracks().forEach(t => t.stop())); this.streams.clear(); },
};

export function maskNik(input: string): string {
  const raw = input.replace(/\D/g, "").slice(0, 16);
  return raw.replace(/(\d{4})(?=\d)/g, "$1 ").trim(); // "1234 5678 9012 3456"
}
export function unmaskNik(masked: string): string {
  return masked.replace(/\D/g, "").slice(0, 16);
}

export function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function parseYMD(s?: string): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return isNaN(dt.getTime()) ? null : dt;
}


/**************** helpers ****************/
export function estimateBrightness(img: ImageData) {
  const d = img.data; let sum = 0; const n = d.length/4;
  for (let i=0;i<d.length;i+=4){ sum += 0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2]; }
  return (sum/n)/2.55; // ≈ 0..100
}
export function estimateSharpness(img: ImageData) {
  const { data, width, height } = img; let acc = 0; let count = 0;
  for (let y=1;y<height-1;y+=2){ for (let x=1;x<width-1;x+=2){
    const gx = grayAt(data,width,x+1,y) - grayAt(data,width,x-1,y);
    const gy = grayAt(data,width,x,y+1) - grayAt(data,width,x,y-1);
    acc += Math.sqrt(gx*gx+gy*gy); count++;
  }}
  return acc / (count||1) / 4; // higher = sharper
}
export function estimateMotion(img: ImageData) {
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
export function grayAt(d: Uint8ClampedArray, w: number, x: number, y: number){
  const i=(y*w+x)*4; return 0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2];
}

export function shuffle<T>(arr: T[]): T[] { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

