import { useEffect, useState } from 'react'
import { Data } from '@application/services/data-service'
import { useDataSnapshot } from '@application/services/useDataSnapshot'
import { Toast } from '@presentation/components/Toast'
import { ConfirmModal } from '@presentation/components/ConfirmModal'
import { PageIntro } from '@presentation/components/PageIntro'

export default function ConfigPage() {
  const snapshot = useDataSnapshot()
  const [cfg, setCfg] = useState(snapshot.config)
  useEffect(() => {
    setCfg(snapshot.config)
  }, [snapshot.config])
  const [confirmReset, setConfirmReset] = useState(false)
  async function save() {
    try {
      await Data.setConfig(cfg)
      Toast.show('Config updated')
    } catch (err) {
      Toast.show('Gagal menyimpan konfigurasi: ' + (err as Error).message, 'error')
    }
  }
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Config</h2>
      <PageIntro>Atur periode kerja, ambang skor, serta fitur yang diaktifkan di backoffice.</PageIntro>
      <div className="bg-white border rounded p-3 space-y-3 max-w-md">
        <label className="text-sm flex flex-col gap-1">
          <span>Period</span>
          <input className="border rounded p-2" value={cfg.period} onChange={e => setCfg({ ...cfg, period: e.target.value })} />
        </label>
        <label className="text-sm">OCR Min: {cfg.thresholds.ocr_min}
          <input type="range" min={0.5} max={0.99} step={0.01} value={cfg.thresholds.ocr_min} onChange={e => setCfg({ ...cfg, thresholds: { ...cfg.thresholds, ocr_min: Number(e.target.value) } })} />
        </label>
        <label className="text-sm">Face Min: {cfg.thresholds.face_min}
          <input type="range" min={0.5} max={0.99} step={0.01} value={cfg.thresholds.face_min} onChange={e => setCfg({ ...cfg, thresholds: { ...cfg.thresholds, face_min: Number(e.target.value) } })} />
        </label>
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={cfg.features.enableAppeal} onChange={e => setCfg({ ...cfg, features: { ...cfg.features, enableAppeal: e.target.checked } })} />
          Enable Appeal
        </label>
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={cfg.features.enableOfflineTKSK} onChange={e => setCfg({ ...cfg, features: { ...cfg.features, enableOfflineTKSK: e.target.checked } })} />
          Enable Offline TKSK
        </label>
        <div className="flex gap-2">
          <button className="px-3 py-1 border rounded" onClick={save}>Save</button>
          <button className="px-3 py-1 border rounded" onClick={() => setConfirmReset(true)}>Reset Data</button>
        </div>
      </div>
      {confirmReset && (
        <ConfirmModal
          title="Reset seluruh data mock?"
          min={0}
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            Data.reset()
            setConfirmReset(false)
            Toast.show('Database direset')
          }}
        />
      )}
    </div>
  )
}
