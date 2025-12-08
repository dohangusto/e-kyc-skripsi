import { useDataSnapshot } from "@application/services/useDataSnapshot";

type Props = { face: number; liveness?: number };

export function ScoreBadge({ face, liveness }: Props) {
  const { thresholds } = useDataSnapshot().config;
  const okFace = face >= thresholds.face_min;
  const okLive = liveness ? liveness >= thresholds.face_min : true;
  return (
    <div className="flex items-center gap-2 text-xs font-medium">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${okFace ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
      >
        <span className="text-[11px] uppercase tracking-wide">Face</span>
        {face}
      </span>
      {typeof liveness === "number" && (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${okLive ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"}`}
        >
          <span className="text-[11px] uppercase tracking-wide">Live</span>
          {liveness}
        </span>
      )}
    </div>
  );
}
