import { useEffect, useMemo, useState } from 'react'
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
  const session = getSession()
  const tkss = useMemo(() => Data.listUsers().filter(u => u.role === 'TKSK').map(u => u.id), [])
  const defaultTksk = session?.role === 'TKSK' ? session.userId : tkss[0] ?? ''
  const [form, setForm] = useState({ datetime: '', tksk: defaultTksk, notes: '' })
  const [errors, setErrors] = useState<Record<string,string>>({})
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const canSchedule = !!session && (
    session.role === 'ADMIN' ||
    session.role === 'RISK' ||
    (session.role === 'TKSK' && app.assigned_to === session.userId)
  )
  const scheduleDisabled = !canSchedule || busy || !form.datetime || !form.tksk

  useEffect(() => {
    setForm(prev => {
      if (session?.role === 'TKSK') {
        return prev.tksk === session.userId ? prev : { ...prev, tksk: session.userId }
      }
      const fallback = tkss[0] ?? ''
      if (!prev.tksk && fallback) {
        return { ...prev, tksk: fallback }
      }
      return prev
    })
  }, [session?.role, session?.userId, tkss])

  async function submit() {
    if (!canSchedule) {
      Toast.show('Anda tidak berwenang menjadwalkan kunjungan untuk kasus ini.', 'error')
      return
    }
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
      const actor = session?.userId || 'system'
      const visit = await Data.createVisit(app.id, { scheduled_at: new Date(form.datetime).toISOString(), tksk_id: form.tksk }, actor)
      await Data.addVisitArtifacts(app.id, visit.id, { checklist: { notes: form.notes } }, actor)
      Toast.show('Kunjungan dijadwalkan', 'success')
      setForm({ datetime: '', tksk: form.tksk, notes: '' })
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
        {session?.role === 'TKSK' && !canSchedule && (
          <p className="text-xs text-amber-600">Penjadwalan dilakukan oleh ADMIN/RISK. Hubungi admin jika butuh kunjungan baru.</p>
        )}
        {session?.role === 'TKSK' && canSchedule && (
          <p className="text-xs text-slate-500">Anda dapat menjadwalkan kunjungan untuk kasus ini. Pastikan memilih waktu yang realistis.</p>
        )}
        {(session?.role === 'ADMIN' || session?.role === 'RISK') && (
          <p className="text-xs text-slate-500">Pilih TKSK dan waktu kunjungan lapangan. TKSK akan mendapat daftar tugas begitu Anda jadwalkan.</p>
        )}
        <div className="grid md:grid-cols-3 gap-3">
          <label className="text-sm flex flex-col gap-1">
            <span>Tanggal & Waktu</span>
            <input type="datetime-local" className="border rounded p-2" value={form.datetime} onChange={e => setForm(f => ({ ...f, datetime: e.target.value }))} />
            {errors.datetime && <span className="text-xs text-rose-600">{errors.datetime}</span>}
          </label>
          <label className="text-sm flex flex-col gap-1">
            <span>TKSK</span>
            <select className="border rounded p-2" value={form.tksk} onChange={e => setForm(f => ({ ...f, tksk: e.target.value }))}>
              {tkss.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
            {errors.tksk && <span className="text-xs text-rose-600">{errors.tksk}</span>}
          </label>
          <label className="text-sm flex flex-col gap-1">
            <span>Catatan</span>
            <textarea className="border rounded p-2" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </label>
        </div>
        {tkss.length === 0 && (
          <p className="text-xs text-rose-600">Belum ada TKSK terdaftar. Tambahkan user TKSK sebelum menjadwalkan.</p>
        )}
        <RoleGate allow={['ADMIN','RISK','TKSK']}>
          <button className="px-3 py-1 border rounded" onClick={submit} disabled={scheduleDisabled}>
            {busy ? 'Menjadwalkan…' : 'Jadwalkan'}
          </button>
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
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const isInProgress = visit.status === 'IN_PROGRESS'
  const checklistReady = visit.photos.length > 0 && !!visit.geotag
  const captureDisabled = !isInProgress
  const submitDisabled = !isInProgress || !checklistReady

  const steps: Array<{ key: string; label: string; status: 'done' | 'current' | 'pending' }> = [
    { key: 'start', label: 'Mulai kunjungan', status: visit.status === 'PLANNED' ? 'current' : visit.status !== 'PLANNED' ? 'done' : 'pending' },
    { key: 'photo', label: 'Unggah foto', status: visit.photos.length > 0 ? 'done' : isInProgress ? 'current' : 'pending' },
    { key: 'geotag', label: 'Geotag', status: visit.geotag ? 'done' : (isInProgress && visit.photos.length > 0 ? 'current' : 'pending') },
    { key: 'submit', label: 'Kirim laporan', status: ['SUBMITTED', 'VERIFIED'].includes(visit.status) ? 'done' : (isInProgress && checklistReady ? 'current' : 'pending') },
    { key: 'verify', label: 'Verifikasi', status: visit.status === 'VERIFIED' ? 'done' : (visit.status === 'SUBMITTED' ? 'current' : 'pending') },
  ]

  const stepClass = (status: 'done' | 'current' | 'pending') => {
    if (status === 'done') return 'bg-emerald-100 border-emerald-200 text-emerald-700'
    if (status === 'current') return 'bg-blue-100 border-blue-300 text-blue-700'
    return 'bg-slate-100 border-slate-200 text-slate-500'
  }

  const handleAction = async (key: string, fn: () => Promise<unknown>, success: string) => {
    try {
      setLoadingAction(key)
      await fn()
      Toast.show(success, 'success')
      onChange()
    } catch (e) {
      Toast.show('Aksi gagal: ' + (e as Error).message, 'error')
    } finally {
      setLoadingAction(null)
    }
  }

  async function captureGeotag() {
    if (!session) {
      Toast.show('Butuh session', 'error')
      return
    }
    setLoadingAction('geotag')
    const actor = session.userId || 'system'
    const store = async (lat: number, lng: number) => {
      await Data.addVisitArtifacts(appId, visit.id, { geotag: { lat, lng } }, actor)
    }
    try {
      if (navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(async pos => {
            await store(pos.coords.latitude, pos.coords.longitude)
            resolve()
          }, async () => {
            await store(-6.2, 106.8)
            resolve()
          })
        })
      } else {
        await store(-6.2, 106.8)
      }
      Toast.show('Geotag tercatat', 'success')
      onChange()
    } catch (e) {
      Toast.show('Gagal menangkap geotag', 'error')
    } finally {
      setLoadingAction(null)
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    if (!session) {
      Toast.show('Butuh session', 'error')
      return
    }
    setUploading(visit.id)
    try {
      const urls: string[] = []
      for (const file of Array.from(files)) {
        urls.push(URL.createObjectURL(file))
      }
      await Data.addVisitArtifacts(appId, visit.id, { photos: [...visit.photos, ...urls] }, session.userId)
      Toast.show('Foto ditambahkan', 'success')
      onChange()
    } catch (e) {
      Toast.show('Upload gagal: ' + (e as Error).message, 'error')
    } finally {
      setUploading(null)
    }
  }

  const startDisabled = visit.status !== 'PLANNED' || loadingAction === 'start'
  const verifyDisabled = visit.status !== 'SUBMITTED' || loadingAction === 'verify'

  return (
    <div className="border rounded p-3 space-y-2 bg-white" aria-live="polite">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">Visit {visit.id}</div>
          <div className="text-xs text-slate-500">{new Date(visit.scheduled_at).toLocaleString('id-ID')}</div>
        </div>
        <span className="text-xs px-2 py-1 bg-slate-100 rounded">{visit.status}</span>
      </div>
      <div className="text-xs flex flex-wrap gap-2">
        {steps.map(step => (
          <span key={step.key} className={`px-2 py-1 rounded border ${stepClass(step.status)}`}>{step.label}</span>
        ))}
      </div>
      <div className="text-sm">TKSK: {visit.tksk_id}</div>
      <div className="text-sm">Geotag: {visit.geotag ? `${visit.geotag.lat.toFixed(4)}, ${visit.geotag.lng.toFixed(4)}` : 'Belum'}</div>
      <div className="text-sm flex flex-wrap gap-2">
        {visit.photos.map((p, i) => (
          <img key={i} src={p} alt={`Visit photo ${i + 1}`} className="w-20 h-20 object-cover rounded" loading="lazy" />
        ))}
        {visit.photos.length === 0 && <span className="text-xs text-slate-400">Belum ada foto kunjungan.</span>}
      </div>
      <div className="text-xs text-slate-500">Checklist: {JSON.stringify(visit.checklist)}</div>
      <div className="space-y-2">
        <p className="text-xs text-slate-500">Urutan TKSK: Mulai → Unggah foto → Geotag → Submit. Lengkapi seluruh langkah sebelum verifikasi.</p>
        <div className="flex flex-wrap gap-2 items-center">
          <RoleGate allow={['TKSK']}>
            <button className="px-3 py-1 border rounded" onClick={() => handleAction('start', () => Data.setVisitStatus(appId, visit.id, 'IN_PROGRESS', session?.userId || 'system'), 'Kunjungan dimulai')} disabled={startDisabled}>
              {loadingAction === 'start' ? 'Memulai…' : 'Start Visit'}
            </button>
          </RoleGate>
          <RoleGate allow={['TKSK']}>
            <label className={`px-3 py-1 border rounded cursor-pointer ${isInProgress ? '' : 'opacity-50 cursor-not-allowed'}`}>
              {uploading ? 'Mengunggah…' : 'Upload Foto'}
              <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} disabled={!isInProgress} />
            </label>
          </RoleGate>
          <RoleGate allow={['TKSK','ADMIN','RISK']}>
            <button className="px-3 py-1 border rounded" onClick={captureGeotag} disabled={captureDisabled || loadingAction === 'geotag'}>
              {loadingAction === 'geotag' ? 'Menangkap…' : 'Capture Geotag'}
            </button>
          </RoleGate>
          <RoleGate allow={['TKSK']}>
            <button className="px-3 py-1 border rounded" disabled={submitDisabled || loadingAction === 'submit'} onClick={() => handleAction('submit', () => Data.setVisitStatus(appId, visit.id, 'SUBMITTED', session?.userId || 'system'), 'Laporan kunjungan dikirim')}>
              {loadingAction === 'submit' ? 'Mengirim…' : 'Submit Visit'}
            </button>
          </RoleGate>
          <RoleGate allow={['ADMIN','RISK']}>
            <button className="px-3 py-1 border rounded" disabled={verifyDisabled} onClick={() => handleAction('verify', () => Data.setVisitStatus(appId, visit.id, 'VERIFIED', session?.userId || 'system'), 'Visit diverifikasi')}>
              {loadingAction === 'verify' ? 'Memverifikasi…' : 'Verify Visit'}
            </button>
          </RoleGate>
        </div>
      </div>
      {uploading && <div className="text-xs text-slate-500">Mengunggah foto…</div>}
    </div>
  )
}
