import { useMemo, useState } from 'react'
import { z } from 'zod'
import { Data } from '@application/services/data-service'
import { useDataSnapshot } from '@application/services/useDataSnapshot'
import { StatusPill } from '@presentation/components/StatusPill'
import { ScoreBadge } from '@presentation/components/ScoreBadge'
import { ConfirmModal } from '@presentation/components/ConfirmModal'
import { Toast } from '@presentation/components/Toast'
import { getSession } from '@shared/session'
import { DocumentGallery } from '@presentation/components/DocumentGallery'
import { VisitManager } from '@presentation/components/VisitManager'
import { RoleGate } from '@presentation/components/RoleGate'
import type { Application, AuditEntry, SurveyStatus } from '@domain/types'

type ActionModal = 'APPROVE' | 'READY' | 'REJECT' | 'RETURN'

const returnSchema = z.object({ reason: z.string().min(10, 'Minimal 10 karakter'), fields: z.array(z.string()).min(1, 'Pilih minimal 1 field') })
const rejectSchema = z.object({ reason: z.string().min(10, 'Minimal 10 karakter'), code: z.string().min(3, 'Kode minimal 3 karakter') })

const TABS = [
  { key: 'summary', label: 'Summary' },
  { key: 'documents', label: 'Documents' },
  { key: 'tksk', label: 'TKSK' },
  { key: 'audit', label: 'Audit' },
]

export default function ApplicationDetailPage({ id }: { id: string }) {
  const snapshot = useDataSnapshot()
  const application = useMemo(
    () => snapshot.applications.find(app => app.id === id) ?? null,
    [snapshot.applications, id],
  )
  const [tab, setTab] = useState<'summary'|'documents'|'tksk'|'audit'>('summary')
  const [modal, setModal] = useState<{ type: ActionModal; candidate?: string } | null>(null)
  const [returnForm, setReturnForm] = useState({ reason: '', fields: [] as string[] })
  const [rejectForm, setRejectForm] = useState({ reason: '', code: '' })
  const session = getSession()

  if (!application) return <div className="text-sm text-slate-600">Data tidak ditemukan.</div>
  if (session?.role === 'TKSK' && application.assigned_to !== session.userId) {
    return <div className="text-sm text-slate-600">Anda tidak memiliki akses ke aplikasi ini.</div>
  }

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action()
      Toast.show(success)
    } catch (e) {
      Toast.show('Gagal: ' + (e as Error).message, 'error')
    } finally {
      setModal(null)
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">{application.id}</h1>
          <p className="text-sm text-slate-600">{application.applicant.name} · {application.region.kab}/{application.region.kec}</p>
          <p className="text-xs text-slate-500">Dibuat: {new Date(application.created_at).toLocaleString('id-ID')}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <StatusPill status={application.status} />
          <ScoreBadge ocr={application.scores.ocr} face={application.scores.face} />
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <RoleGate allow={['ADMIN']}>
          <button className="px-3 py-1 border rounded" disabled={!['DESK_REVIEW','FIELD_VISIT'].includes(application.status)} onClick={() => setModal({ type: 'RETURN' })}>Return</button>
        </RoleGate>
        <RoleGate allow={['ADMIN']}>
          <button className="px-3 py-1 border rounded" disabled={!['DESK_REVIEW','FIELD_VISIT'].includes(application.status)} onClick={() => setModal({ type: 'REJECT' })}>Reject</button>
        </RoleGate>
        <RoleGate allow={['ADMIN']}>
          <button className="px-3 py-1 border rounded" disabled={!['DESK_REVIEW','FIELD_VISIT'].includes(application.status)} onClick={() => setModal({ type: 'APPROVE' })}>Approve</button>
        </RoleGate>
        <RoleGate allow={['ADMIN']}>
          <button className="px-3 py-1 border rounded" disabled={application.status !== 'FINAL_APPROVED'} onClick={() => setModal({ type: 'READY' })}>Disbursement Ready</button>
        </RoleGate>
      </div>

      <nav role="tablist" aria-label="Application detail tabs" className="flex flex-wrap gap-2 border-b pb-2">
        {TABS.map(t => (
          <button
            role="tab"
            key={t.key}
            aria-selected={tab === t.key}
            className={`px-3 py-1 rounded ${tab === t.key ? 'bg-blue-600 text-white' : 'bg-white border'}`}
            onClick={() => setTab(t.key as typeof tab)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'summary' && <SummaryTab application={application} />}
      {tab === 'documents' && <DocumentsTab application={application} />}
      {tab === 'tksk' && (
        <VisitManager
          app={application}
          onChange={() => {
            Data.syncFromServer().catch(() => undefined)
          }}
        />
      )}
      {tab === 'audit' && <AuditTab appId={application.id} rows={snapshot.audit} />}

      {modal?.type === 'APPROVE' && (
        <ConfirmModal
          title="Approve Application"
          min={10}
          onCancel={() => setModal(null)}
          onConfirm={reason => run(() => Data.updateStatus(application.id, 'FINAL_APPROVED', session?.userId || 'system', reason), 'Disetujui')}
        />
      )}
      {modal?.type === 'READY' && (
        <ConfirmModal
          title="Set Disbursement Ready"
          min={5}
          onCancel={() => setModal(null)}
          onConfirm={reason => run(() => Data.updateStatus(application.id, 'DISBURSEMENT_READY', session?.userId || 'system', reason), 'Siap disbursement')}
        />
      )}

      {modal?.type === 'RETURN' && (
        <ReturnModal
          value={returnForm}
          onChange={setReturnForm}
          onCancel={() => { setModal(null); setReturnForm({ reason: '', fields: [] }) }}
          onSubmit={() => {
            const parsed = returnSchema.safeParse(returnForm)
            if (!parsed.success) {
              const msg = parsed.error.issues[0]?.message || 'Invalid'
              Toast.show(msg, 'error')
              return
            }
            run(() => Data.updateStatus(application.id, 'RETURNED_FOR_REVISION', session?.userId || 'system', `${returnForm.fields.join(', ')} :: ${returnForm.reason}`), 'Dikembalikan ke nasabah')
            setReturnForm({ reason: '', fields: [] })
          }}
        />
      )}

      {modal?.type === 'REJECT' && (
        <RejectModal
          value={rejectForm}
          onChange={setRejectForm}
          onCancel={() => { setModal(null); setRejectForm({ reason: '', code: '' }) }}
          onSubmit={() => {
            const parsed = rejectSchema.safeParse(rejectForm)
            if (!parsed.success) {
              const msg = parsed.error.issues[0]?.message || 'Invalid'
              Toast.show(msg, 'error')
              return
            }
            run(() => Data.updateStatus(application.id, 'FINAL_REJECTED', session?.userId || 'system', `${rejectForm.code} :: ${rejectForm.reason}`), 'Ditolak')
            setRejectForm({ reason: '', code: '' })
          }}
        />
      )}
    </div>
  )
}

function DocumentsTab({ application }: { application: Application }) {
  return (
    <section className="space-y-4" role="tabpanel">
      <DocumentGallery documents={application.documents} />
      <SurveyPanel survey={application.survey} />
    </section>
  )
}

function SurveyPanel({ survey }: { survey?: Application['survey'] }) {
  if (!survey) {
    return (
      <aside className="bg-white border rounded p-4 text-sm space-y-2" aria-label="Survey keluarga">
        <header>
          <h3 className="text-base font-semibold">Survey Keluarga</h3>
          <p className="text-xs text-slate-500">Belum ada data survey yang dikumpulkan.</p>
        </header>
      </aside>
    )
  }

  const statusLabel = survey.status ? formatSurveyStatus(survey.status) : 'Status belum tersedia'
  const submitted = survey.submitted_at ? formatSurveyDate(survey.submitted_at) : 'Belum pernah'
  const statusTone = survey.status ? getSurveyStatusTone(survey.status) : 'bg-slate-200 text-slate-700'

  return (
    <aside className="bg-white border rounded p-4 text-sm space-y-4" aria-label="Survey keluarga">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">Survey Keluarga</h3>
          <p className="text-xs text-slate-500">Rekap jawaban survey kesejahteraan keluarga.</p>
        </div>
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full ${statusTone}`}>
          {statusLabel}
        </span>
      </header>

      <div className="grid gap-3 sm:grid-cols-3 text-xs">
        <MetadataItem label="Terakhir dikirim" value={submitted} />
        <MetadataItem label="Survey selesai" value={survey.completed ? 'Ya' : 'Belum'} />
        <MetadataItem label="Jumlah bagian terisi" value={survey.answers ? 'Lengkap' : 'Belum lengkap'} />
      </div>

      {survey.answers ? (
        <div className="space-y-4">
          <SurveySection
            title="B. Kondisi Keluarga"
            fields={[
              { label: 'Jumlah anggota keluarga dalam KK', value: survey.answers.partB.householdMembers },
              { label: 'Tanggungan anak sekolah', value: survey.answers.partB.schoolChildren },
              { label: 'Anak balita', value: survey.answers.partB.toddlers },
              { label: 'Anggota lansia', value: survey.answers.partB.elderly },
              { label: 'Disabilitas / penyakit kronis', value: survey.answers.partB.disability },
            ]}
          />
          <SurveySection
            title="C. Pendidikan & Pekerjaan"
            fields={[
              { label: 'Pendidikan terakhir', value: survey.answers.partC.education },
              { label: 'Pekerjaan kepala keluarga', value: survey.answers.partC.occupation },
              { label: 'Penghasilan per bulan', value: survey.answers.partC.income },
              { label: 'Penghasilan tambahan', value: survey.answers.partC.extraIncome },
            ]}
          />
          <SurveySection
            title="D. Kondisi Tempat Tinggal & Aset"
            fields={[
              { label: 'Status kepemilikan rumah', value: survey.answers.partD.homeOwnership },
              { label: 'Jenis lantai rumah', value: survey.answers.partD.floorType },
              { label: 'Jenis dinding rumah', value: survey.answers.partD.wallType },
              { label: 'Jenis atap rumah', value: survey.answers.partD.roofType },
              { label: 'Kepemilikan kendaraan', value: survey.answers.partD.vehicle },
              { label: 'Kepemilikan tabungan', value: survey.answers.partD.savings },
              { label: 'Sumber energi listrik', value: survey.answers.partD.lighting },
              { label: 'Sumber air minum', value: survey.answers.partD.waterSource },
              { label: 'Bahan bakar memasak', value: survey.answers.partD.cookingFuel },
              { label: 'Sarana MCK', value: survey.answers.partD.toilet },
              { label: 'Pembuangan limbah', value: survey.answers.partD.wasteDisposal },
              { label: 'Kondisi sanitasi', value: survey.answers.partD.sanitation },
            ]}
          />
          <SurveySection
            title="E. Kesehatan & Kebiasaan"
            fields={[
              { label: 'Pemeriksaan kesehatan rutin', value: survey.answers.partE.healthCheck },
            ]}
          />
        </div>
      ) : (
        <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          Survey sudah tercatat namun jawaban detail belum lengkap.
        </div>
      )}
    </aside>
  )
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 font-medium text-slate-700">{value}</div>
    </div>
  )
}

function SurveySection({ title, fields }: { title: string; fields: Array<{ label: string; value: string | number | '' | undefined }> }) {
  return (
    <section className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map(field => (
          <div key={field.label} className="rounded border border-slate-200 bg-slate-50 p-3 text-xs">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">{field.label}</div>
            <div className="mt-1 font-medium text-slate-700">{formatSurveyValue(field.value)}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function formatSurveyValue(value: string | number | '' | undefined) {
  if (value === '' || value === undefined || value === null) return '—'
  return typeof value === 'number' ? value.toString() : value
}

function formatSurveyStatus(status: SurveyStatus) {
  if (!status) return 'Status belum tersedia'
  const map: Record<string, string> = {
    'belum-dikumpulkan': 'Belum dikumpulkan',
    antrean: 'Dalam antrean',
    diperiksa: 'Sedang diperiksa',
    disetujui: 'Disetujui',
    ditolak: 'Ditolak',
  }
  return map[status] ?? status
}

function formatSurveyDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

function getSurveyStatusTone(status: SurveyStatus) {
  switch (status) {
    case 'belum-dikumpulkan':
      return 'bg-slate-200 text-slate-700'
    case 'antrean':
      return 'bg-amber-100 text-amber-600'
    case 'diperiksa':
      return 'bg-blue-100 text-blue-600'
    case 'disetujui':
      return 'bg-emerald-100 text-emerald-700'
    case 'ditolak':
      return 'bg-rose-100 text-rose-600'
    default:
      return 'bg-slate-200 text-slate-700'
  }
}

function SummaryTab({ application }: { application: Application }) {
  return (
    <section className="grid md:grid-cols-3 gap-4" role="tabpanel">
      <div className="bg-white border rounded p-3 space-y-2 md:col-span-2">
        <div className="grid md:grid-cols-2 gap-2 text-sm">
          <div><span className="font-medium">NIK</span><br />{application.applicant.nik_mask}</div>
          <div><span className="font-medium">Phone</span><br />{application.applicant.phone_mask}</div>
          <div><span className="font-medium">DOB</span><br />{application.applicant.dob}</div>
          <div><span className="font-medium">Region</span><br />{application.region.prov} / {application.region.kab} / {application.region.kec} / {application.region.kel}</div>
        </div>
        <div className="text-sm">Flags: {application.flags.duplicate_face ? '👤 dup face ' : ''}{application.flags.duplicate_nik ? '🆔 dup nik ' : ''}{application.flags.device_anomaly ? '📱 device anomaly ' : ''}{application.flags.escalated ? '🚨 escalated ' : ''}</div>
        <div className="text-sm">Assigned: {application.assigned_to}</div>
        <div>
          <h4 className="font-medium text-sm">Timeline</h4>
          <ol className="relative border-l border-slate-200 ml-4 space-y-2">
            {application.timeline.slice().reverse().map((t, i) => (
              <li key={i} className="pl-3">
                <span className="absolute -left-[7px] mt-1 w-3 h-3 bg-blue-500 rounded-full" aria-hidden="true" />
                <p className="text-xs text-slate-500">{new Date(t.at).toLocaleString('id-ID')}</p>
                <p className="text-sm">{t.action} · {t.by}</p>
                {t.reason && <p className="text-xs text-slate-500">{t.reason}</p>}
              </li>
            ))}
          </ol>
        </div>
      </div>
      <aside className="bg-white border rounded p-3 space-y-2">
        <h4 className="font-medium">Scores</h4>
        <p className="text-sm">OCR: {application.scores.ocr}</p>
        <p className="text-sm">Face: {application.scores.face}</p>
        <p className="text-sm">Liveness: {application.scores.liveness}</p>
        <p className="text-sm">Aging: {application.aging_days} hari</p>
      </aside>
    </section>
  )
}

function AuditTab({ appId, rows }: { appId: string; rows: AuditEntry[] }) {
  const filtered = rows.filter(a => a.entity === appId).slice().reverse()
  return (
    <section role="tabpanel" className="bg-white border rounded p-3 overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100">
          <tr><th className="text-left p-2">At</th><th className="text-left p-2">Actor</th><th className="text-left p-2">Action</th><th className="text-left p-2">Reason</th></tr>
        </thead>
        <tbody>
          {filtered.map((row, idx) => (
            <tr key={idx}>
              <td className="p-2 text-xs text-slate-500">{new Date(row.at).toLocaleString('id-ID')}</td>
              <td className="p-2">{row.actor}</td>
              <td className="p-2">{row.action}</td>
              <td className="p-2 text-xs text-slate-500">{row.reason || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && <p className="text-sm text-slate-500">Belum ada audit log.</p>}
    </section>
  )
}

function ReturnModal({ value, onChange, onCancel, onSubmit }: { value: { reason: string; fields: string[] }; onChange: (next: { reason: string; fields: string[] }) => void; onCancel: () => void; onSubmit: () => void }) {
  const fields = ['Foto KTP', 'Foto Selfie', 'Kartu Keluarga', 'Alamat Domisili', 'Koordinat Rumah']
  function toggle(field: string) {
    onChange({ ...value, fields: value.fields.includes(field) ? value.fields.filter(f => f !== field) : [...value.fields, field] })
  }
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur grid place-items-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded shadow max-w-lg w-full p-4 space-y-3">
        <h3 className="font-semibold">Return Application</h3>
        <div className="space-y-2">
          <p className="text-sm font-medium">Field diminta ulang</p>
          <div className="flex flex-wrap gap-2">
            {fields.map(f => (
              <label key={f} className="text-xs border rounded px-2 py-1 flex items-center gap-1">
                <input type="checkbox" checked={value.fields.includes(f)} onChange={() => toggle(f)} /> {f}
              </label>
            ))}
          </div>
        </div>
        <label className="text-sm flex flex-col gap-1">
          <span>Alasan (min 10 karakter)</span>
          <textarea className="border rounded p-2 h-24" value={value.reason} onChange={e => onChange({ ...value, reason: e.target.value })} />
        </label>
        <div className="flex justify-end gap-2">
          <button className="px-3 py-1 border rounded" onClick={onCancel}>Batal</button>
          <button className="px-3 py-1 border rounded bg-blue-600 text-white" onClick={onSubmit}>Return</button>
        </div>
      </div>
    </div>
  )
}

function RejectModal({ value, onChange, onCancel, onSubmit }: { value: { reason: string; code: string }; onChange: (next: { reason: string; code: string }) => void; onCancel: () => void; onSubmit: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur grid place-items-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded shadow max-w-lg w-full p-4 space-y-3">
        <h3 className="font-semibold">Reject Application</h3>
        <label className="text-sm flex flex-col gap-1">
          <span>Kode Penolakan</span>
          <input className="border rounded p-2" value={value.code} onChange={e => onChange({ ...value, code: e.target.value })} placeholder="contoh: RSK-101" />
        </label>
        <label className="text-sm flex flex-col gap-1">
          <span>Alasan (min 10 karakter)</span>
          <textarea className="border rounded p-2 h-24" value={value.reason} onChange={e => onChange({ ...value, reason: e.target.value })} />
        </label>
        <div className="flex justify-end gap-2">
          <button className="px-3 py-1 border rounded" onClick={onCancel}>Batal</button>
          <button className="px-3 py-1 border rounded bg-rose-600 text-white" onClick={onSubmit}>Reject</button>
        </div>
      </div>
    </div>
  )
}
