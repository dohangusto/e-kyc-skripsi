export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export const cameraManager = {
  streams: new Set<MediaStream>(),
  register(s: MediaStream) {
    this.streams.add(s);
  },
  unregister(s?: MediaStream | null) {
    if (!s) return;
    s.getTracks().forEach(t => t.stop());
    this.streams.delete(s);
  },
  stopAll() {
    this.streams.forEach(s => s.getTracks().forEach(t => t.stop()));
    this.streams.clear();
  },
};