import { useMemo, useState } from 'react'
import { z } from 'zod'
import { Data } from '@application/services/data-service'
import { StatusPill } from '@presentation/components/StatusPill'
import { ScoreBadge } from '@presentation/components/ScoreBadge'
import { ConfirmModal } from '@presentation/components/ConfirmModal'
import { Toast } from '@presentation/components/Toast'
import { getSession } from '@shared/session'
import { DocumentGallery } from '@presentation/components/DocumentGallery'
import { VisitManager } from '@presentation/components/VisitManager'
import { RoleGate } from '@presentation/components/RoleGate'
import type { Application } from '@domain/types'

type ActionModal = 'APPROVE' | 'ESCALATE' | 'READY' | 'REJECT' | 'RETURN' | 'LINK_DUP' | 'IGNORE_DUP'

const returnSchema = z.object({ reason: z.string().min(10, 'Minimal 10 karakter'), fields: z.array(z.string()).min(1, 'Pilih minimal 1 field') })
const rejectSchema = z.object({ reason: z.string().min(10, 'Minimal 10 karakter'), code: z.string().min(3, 'Kode minimal 3 karakter') })

const TABS = [
  { key: 'summary', label: 'Summary' },
  { key: 'documents', label: 'Documents' },
  { key: 'tksk', label: 'TKSK' },
  { key: 'risk', label: 'Risk' },
  { key: 'audit', label: 'Audit' },
]

export default function ApplicationDetailPage({ id }: { id: string }) {
  const [snapshot, setSnapshot] = useState(Data.get())
  const application = useMemo(() => Data.getApplication(id), [snapshot, id])
  const [tab, setTab] = useState<'summary'|'documents'|'tksk'|'risk'|'audit'>('summary')
  const [modal, setModal] = useState<{ type: ActionModal; candidate?: string } | null>(null)
  const [returnForm, setReturnForm] = useState({ reason: '', fields: [] as string[] })
  const [rejectForm, setRejectForm] = useState({ reason: '', code: '' })
  const session = getSession()

  if (!application) return <div className="text-sm text-slate-600">Data tidak ditemukan.</div>
  if (session?.role === 'TKSK' && application.assigned_to !== session.userId) {
    return <div className="text-sm text-slate-600">Anda tidak memiliki akses ke aplikasi ini.</div>
  }

  function refresh() {
    setSnapshot(Data.refresh())
  }

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action()
      Toast.show(success)
      refresh()
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
        <RoleGate allow={['ADMIN','TKSK']}>
          <button className="px-3 py-1 border rounded" disabled={application.status !== 'DESK_REVIEW'} onClick={() => setModal({ type: 'ESCALATE' })}>Escalate to Risk</button>
        </RoleGate>
        <RoleGate allow={['ADMIN','RISK']}>
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
      {tab === 'documents' && <DocumentGallery documents={application.documents} />}
      {tab === 'tksk' && <VisitManager app={application} onChange={refresh} />}
      {tab === 'risk' && <RiskTab application={application} onLink={(candidateId) => setModal({ type: 'LINK_DUP', candidate: candidateId })} onIgnore={() => setModal({ type: 'IGNORE_DUP' })} />}
      {tab === 'audit' && <AuditTab appId={application.id} />}

      {modal?.type === 'APPROVE' && (
        <ConfirmModal
          title="Approve Application"
          min={10}
          onCancel={() => setModal(null)}
          onConfirm={reason => run(() => Data.updateStatus(application.id, 'FINAL_APPROVED', session?.userId || 'system', reason), 'Disetujui')}
        />
      )}
      {modal?.type === 'ESCALATE' && (
        <ConfirmModal
          title="Escalate to Risk"
          min={5}
          onCancel={() => setModal(null)}
          onConfirm={reason => run(() => Data.escalateToRisk(application.id, session?.userId || 'system', reason), 'Di-escalate ke risk')}
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
      {modal?.type === 'LINK_DUP' && (
        <ConfirmModal
          title="Link as Duplicate"
          min={5}
          onCancel={() => setModal(null)}
          onConfirm={reason => run(() => Data.linkDuplicate(application.id, modal.candidate!, session?.userId || 'system', reason), 'Duplicate ditautkan')}
        />
      )}
      {modal?.type === 'IGNORE_DUP' && (
        <ConfirmModal
          title="Ignore Duplicate"
          min={5}
          onCancel={() => setModal(null)}
          onConfirm={reason => run(() => Data.ignoreDuplicate(application.id, session?.userId || 'system', reason), 'Flag duplicate ditutup')}
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

function RiskTab({ application, onLink, onIgnore }: { application: Application; onLink: (id: string) => void; onIgnore: () => void }) {
  const candidates = application.flags.candidates || []
  return (
    <section role="tabpanel" className="space-y-4">
      <div className="bg-white border rounded p-3">
        <h4 className="font-medium">Flag Summary</h4>
        <p className="text-sm">duplicate_face: {String(application.flags.duplicate_face)} · duplicate_nik: {String(application.flags.duplicate_nik)} · device_anomaly: {String(application.flags.device_anomaly)}</p>
        <p className="text-sm">similarity score: {application.flags.similarity}</p>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {candidates.length === 0 && <p className="text-sm text-slate-500">Tidak ada kandidat duplicate.</p>}
        {candidates.map(c => (
          <div key={c.id} className="border rounded p-3 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{c.name}</p>
                <p className="text-xs text-slate-500">Similarity {c.similarity}</p>
              </div>
              {c.selfie_url && <img src={c.selfie_url} alt={`${c.name} selfie`} className="w-16 h-16 object-cover rounded" loading="lazy" />}
            </div>
            <div className="flex gap-2">
              <RoleGate allow={['RISK','ADMIN']}>
                <button className="px-3 py-1 border rounded" onClick={() => onLink(c.id)}>Link as Dup</button>
              </RoleGate>
              <RoleGate allow={['RISK','ADMIN']}>
                <button className="px-3 py-1 border rounded" onClick={onIgnore}>Ignore</button>
              </RoleGate>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function AuditTab({ appId }: { appId: string }) {
  const rows = Data.get().audit.filter(a => a.entity === appId).slice().reverse()
  return (
    <section role="tabpanel" className="bg-white border rounded p-3 overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100">
          <tr><th className="text-left p-2">At</th><th className="text-left p-2">Actor</th><th className="text-left p-2">Action</th><th className="text-left p-2">Reason</th></tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              <td className="p-2 text-xs text-slate-500">{new Date(row.at).toLocaleString('id-ID')}</td>
              <td className="p-2">{row.actor}</td>
              <td className="p-2">{row.action}</td>
              <td className="p-2 text-xs text-slate-500">{row.reason || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="text-sm text-slate-500">Belum ada audit log.</p>}
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
