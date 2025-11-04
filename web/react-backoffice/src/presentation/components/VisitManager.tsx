import { useState } from 'react'
import { z } from 'zod'
import type { Application, Visit } from '@domain/types'
import { Data } from '@application/services/data-service'
import { Toast } from './Toast'
import { RoleGate } from './RoleGate'
import { getSession } from '@shared/session'

const scheduleSchema = z.object({
  datetime: z.string().min(1, 'Tanggal wajib diisi'),
  tksk: z.string().min(1, 'Pilih TKSK'),
  notes: z.string().optional(),
})

export function VisitManager({ app, onChange }: { app: Application; onChange: () => void }) {
  const [form, setForm] = useState({ datetime: '', tksk: 'TKSK-1002', notes: '' })
  const [errors, setErrors] = useState<Record<string,string>>({})
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const session = getSession()

  async function submit() {
    const parse = scheduleSchema.safeParse(form)
    if (!parse.success) {
      const err: Record<string,string> = {}
      parse.error.issues.forEach(i => { if (i.path[0]) err[String(i.path[0])] = i.message })
      setErrors(err)
      return
    }
    setErrors({})
    try {
      setBusy(true)
      const visit = await Data.createVisit(app.id, { scheduled_at: new Date(form.datetime).toISOString(), tksk_id: form.tksk }, session?.userId || 'system')
      await Data.addVisitArtifacts(app.id, visit.id, { checklist: { notes: form.notes } }, session?.userId || 'system')
      Toast.show('Visit created')
      setForm({ datetime: '', tksk: 'TKSK-1002', notes: '' })
      onChange()
    } catch (e) {
      Toast.show('Gagal membuat visit: ' + (e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-100 rounded p-3 space-y-2">
        <h4 className="font-medium">Jadwalkan Kunjungan</h4>
        <div className="grid md:grid-cols-3 gap-3">
          <label className="text-sm flex flex-col gap-1">
            <span>Tanggal & Waktu</span>
            <input type="datetime-local" className="border rounded p-2" value={form.datetime} onChange={e => setForm(f => ({ ...f, datetime: e.target.value }))} />
            {errors.datetime && <span className="text-xs text-rose-600">{errors.datetime}</span>}
          </label>
          <label className="text-sm flex flex-col gap-1">
            <span>TKSK</span>
            <select className="border rounded p-2" value={form.tksk} onChange={e => setForm(f => ({ ...f, tksk: e.target.value }))}>
              {Array.from(new Set(Data.get().users.filter(u => u.role === 'TKSK').map(u => u.id))).map(id => <option key={id} value={id}>{id}</option>)}
            </select>
            {errors.tksk && <span className="text-xs text-rose-600">{errors.tksk}</span>}
          </label>
          <label className="text-sm flex flex-col gap-1">
            <span>Catatan</span>
            <textarea className="border rounded p-2" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </label>
        </div>
        <RoleGate allow={['ADMIN','RISK']}>
          <button className="px-3 py-1 border rounded" onClick={submit} disabled={busy}>Jadwalkan</button>
        </RoleGate>
      </div>

      <div className="space-y-3">
        {app.visits.length === 0 && <p className="text-sm text-slate-500">Belum ada kunjungan.</p>}
        {app.visits.map(v => (
          <VisitCard key={v.id} visit={v} appId={app.id} onChange={onChange} setUploading={setUploading} uploading={uploading === v.id} />
        ))}
      </div>
    </div>
  )
}

function VisitCard({ visit, appId, onChange, uploading, setUploading }: { visit: Visit; appId: string; onChange: () => void; uploading: boolean; setUploading: (id: string | null) => void }) {
  const session = getSession()

  async function action(fn: () => Promise<unknown>, message: string) {
    try {
      await fn()
      Toast.show(message)
      onChange()
    } catch (e) {
      Toast.show('Aksi gagal: ' + (e as Error).message, 'error')
    }
  }

  async function captureGeotag() {
    if (!session) return Toast.show('Butuh session', 'error')
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async pos => {
        await Data.addVisitArtifacts(appId, visit.id, { geotag: { lat: pos.coords.latitude, lng: pos.coords.longitude } }, session.userId)
        Toast.show('Geotag ditangkap')
        onChange()
      }, async () => {
        await Data.addVisitArtifacts(appId, visit.id, { geotag: { lat: -6.2, lng: 106.8 } }, session.userId)
        Toast.show('Geotag dummy diset')
        onChange()
      })
    } else {
      await Data.addVisitArtifacts(appId, visit.id, { geotag: { lat: -6.2, lng: 106.8 } }, session.userId || 'system')
      Toast.show('Geotag dummy diset')
      onChange()
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    if (!session) return Toast.show('Butuh session', 'error')
    setUploading(visit.id)
    try {
      const urls: string[] = []
      for (const file of Array.from(files)) {
        urls.push(URL.createObjectURL(file))
      }
      await Data.addVisitArtifacts(appId, visit.id, { photos: [...visit.photos, ...urls] }, session.userId)
      Toast.show('Foto ditambahkan')
      onChange()
    } catch (e) {
      Toast.show('Upload gagal: ' + (e as Error).message, 'error')
    } finally {
      setUploading(null)
    }
  }

  return (
    <div className="border rounded p-3 space-y-2 bg-white" aria-live="polite">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">Visit {visit.id}</div>
          <div className="text-xs text-slate-500">{visit.scheduled_at}</div>
        </div>
        <span className="text-xs px-2 py-1 bg-slate-100 rounded">{visit.status}</span>
      </div>
      <div className="text-sm">TKSK: {visit.tksk_id}</div>
      <div className="text-sm">Geotag: {visit.geotag ? `${visit.geotag.lat.toFixed(4)}, ${visit.geotag.lng.toFixed(4)}` : 'Belum'}</div>
      <div className="text-sm flex flex-wrap gap-2">
        {visit.photos.map((p, i) => (
          <img key={i} src={p} alt={`Visit photo ${i+1}`} className="w-20 h-20 object-cover rounded" loading="lazy" />
        ))}
      </div>
      <div className="text-xs text-slate-500">Checklist: {JSON.stringify(visit.checklist)}</div>
      <div className="flex flex-wrap gap-2 items-center">
        <RoleGate allow={['TKSK']}>
          <button className="px-3 py-1 border rounded" onClick={() => action(() => Data.setVisitStatus(appId, visit.id, 'IN_PROGRESS', session?.userId || 'system'), 'Visit dimulai')} disabled={visit.status !== 'PLANNED'}>Start Visit</button>
        </RoleGate>
        <RoleGate allow={['TKSK']}>
          <label className="px-3 py-1 border rounded cursor-pointer">
            Upload Foto
            <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
          </label>
        </RoleGate>
        <RoleGate allow={['TKSK','ADMIN','RISK']}>
          <button className="px-3 py-1 border rounded" onClick={captureGeotag}>Capture Geotag</button>
        </RoleGate>
        <RoleGate allow={['TKSK']}>
          <button className="px-3 py-1 border rounded" disabled={visit.status !== 'IN_PROGRESS' || visit.photos.length === 0 || !visit.geotag} onClick={() => action(() => Data.setVisitStatus(appId, visit.id, 'SUBMITTED', session?.userId || 'system'), 'Visit disubmit')}>Submit Visit</button>
        </RoleGate>
        <RoleGate allow={['ADMIN','RISK']}>
          <button className="px-3 py-1 border rounded" disabled={visit.status !== 'SUBMITTED'} onClick={() => action(() => Data.setVisitStatus(appId, visit.id, 'VERIFIED', session?.userId || 'system'), 'Visit diverifikasi')}>Verify Visit</button>
        </RoleGate>
      </div>
      {uploading && <div className="text-xs text-slate-500">Uploading...</div>}
    </div>
  )
}
