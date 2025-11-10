import { useDataSnapshot } from '@application/services/useDataSnapshot'

export function ScoreBadge({ ocr, face }: { ocr: number; face: number }) {
  const { thresholds } = useDataSnapshot().config
  const okOcr = ocr >= thresholds.ocr_min
  const okFace = face >= thresholds.face_min
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className={`px-1.5 py-0.5 rounded ${okOcr ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>OCR {ocr}</span>
      <span className={`px-1.5 py-0.5 rounded ${okFace ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>Face {face}</span>
    </div>
  )
}
