import { useMemo, useState } from 'react'
import { Data } from '@application/services/data-service'
import { ConfirmModal } from '@presentation/components/ConfirmModal'
import { Toast } from '@presentation/components/Toast'
import { ScoreBadge } from '@presentation/components/ScoreBadge'
import type { Application } from '@domain/types'
import { getSession } from '@shared/session'

export default function RiskPage() {
  const [snapshot, setSnapshot] = useState(Data.get())
  const flagged = useMemo(
    () => snapshot.applications.filter(a => a.flags.duplicate_face || a.flags.duplicate_nik || a.flags.device_anomaly),
    [snapshot],
  )
  const [selectedId, setSelectedId] = useState<string | null>(flagged[0]?.id ?? null)
  const [modal, setModal] = useState<{ type: 'LINK' | 'IGNORE'; candidate?: string } | null>(null)
  const selected = flagged.find(a => a.id === selectedId) ?? flagged[0] ?? null
  const config = snapshot.config
  const session = getSession()

  function refresh() {
    setSnapshot(Data.refresh())
  }

  async function run(action: () => Promise<unknown>, message: string) {
    try {
      await action()
      Toast.show(message)
      refresh()
    } catch (e) {
      Toast.show('Gagal: ' + (e as Error).message, 'error')
    } finally {
      setModal(null)
    }
  }

  function updateThreshold(type: 'ocr_min' | 'face_min', value: number) {
    Data.setConfig({ ...config, thresholds: { ...config.thresholds, [type]: value } })
    refresh()
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Risk Desk</h2>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            OCR Min {config.thresholds.ocr_min.toFixed(2)}
            <input type="range" min={0.5} max={0.99} step={0.01} value={config.thresholds.ocr_min} onChange={e => updateThreshold('ocr_min', Number(e.target.value))} />
          </label>
          <label className="flex items-center gap-2">
            Face Min {config.thresholds.face_min.toFixed(2)}
            <input type="range" min={0.5} max={0.99} step={0.01} value={config.thresholds.face_min} onChange={e => updateThreshold('face_min', Number(e.target.value))} />
          </label>
        </div>
      </header>

      <div className="grid md:grid-cols-6 gap-4">
        <aside className="md:col-span-2 bg-white border rounded p-3 space-y-2" aria-label="Flagged list">
          <h3 className="font-medium">Flagged Bucket ({flagged.length})</h3>
          <div className="max-h-[420px] overflow-auto" role="list">
            {flagged.map(app => (
              <button
                key={app.id}
                role="listitem"
                className={`w-full text-left border rounded p-2 text-xs mb-2 ${selected?.id === app.id ? 'bg-blue-50 border-blue-400' : 'bg-white'}`}
                onClick={() => setSelectedId(app.id)}
              >
                <div className="font-semibold">{app.id}</div>
                <div>{app.applicant.name}</div>
                <div>Flags: {flagLabel(app)}</div>
              </button>
            ))}
            {flagged.length === 0 && <p className="text-sm text-slate-500">Tidak ada aplikasi flagged.</p>}
          </div>
        </aside>

        <section className="md:col-span-4 space-y-4" aria-live="polite">
          {selected ? (
            <SelectedCard app={selected} onLink={(id) => setModal({ type: 'LINK', candidate: id })} onIgnore={() => setModal({ type: 'IGNORE' })} />
          ) : (
            <p className="text-sm text-slate-500">Pilih aplikasi untuk review.</p>
          )}
        </section>
      </div>

      {modal?.type === 'LINK' && selected && (
        <ConfirmModal
          title={`Link ${modal.candidate} sebagai duplicate`}
          min={5}
          onCancel={() => setModal(null)}
          onConfirm={(reason) => run(() => Data.linkDuplicate(selected.id, modal.candidate!, session?.userId || 'RISK', reason), 'Duplicate ditautkan')}
        />
      )}
      {modal?.type === 'IGNORE' && selected && (
        <ConfirmModal
          title="Ignore flag duplicate"
          min={5}
          onCancel={() => setModal(null)}
          onConfirm={(reason) => run(() => Data.ignoreDuplicate(selected.id, session?.userId || 'RISK', reason), 'Flag duplicate ditutup')}
        />
      )}
    </div>
  )
}

function flagLabel(app: Application) {
  const arr = []
  if (app.flags.duplicate_face) arr.push('face')
  if (app.flags.duplicate_nik) arr.push('nik')
  if (app.flags.device_anomaly) arr.push('device')
  return arr.join(', ')
}

function SelectedCard({ app, onLink, onIgnore }: { app: Application; onLink: (id: string) => void; onIgnore: () => void }) {
  const candidates = app.flags.candidates ?? []
  return (
    <div className="bg-white border rounded p-4 space-y-3">
      <div className="flex justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold">{app.id}</h3>
          <p className="text-sm text-slate-500">{app.applicant.name}</p>
        </div>
        <ScoreBadge ocr={app.scores.ocr} face={app.scores.face} />
      </div>
      <p className="text-sm">Flags: {flagLabel(app) || '-'}</p>
      <div className="grid md:grid-cols-2 gap-3">
        {candidates.length === 0 && <p className="text-sm text-slate-500">Tidak ada kandidat duplicate.</p>}
        {candidates.map(c => (
          <div key={c.id} className="border rounded p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{c.name}</p>
                <p className="text-xs text-slate-500">Similarity {c.similarity}</p>
              </div>
              {c.selfie_url && <img src={c.selfie_url} alt={`${c.name} selfie`} className="w-16 h-16 object-cover rounded" loading="lazy" />}
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 border rounded" onClick={() => onLink(c.id)}>Link as Dup</button>
              <button className="px-3 py-1 border rounded" onClick={onIgnore}>Ignore</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
