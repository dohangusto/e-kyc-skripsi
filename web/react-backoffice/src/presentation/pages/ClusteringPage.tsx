import { useEffect, useMemo, useRef, useState } from 'react'
import type { ClusteringCandidate } from '@domain/types'
import { BackofficeAPI } from '@application/services/api'
import { Data } from '@application/services/data-service'
import { useDataSnapshot } from '@application/services/useDataSnapshot'
import { getSession } from '@shared/session'
import { Toast } from '@presentation/components/Toast'
import { ConfirmModal } from '@presentation/components/ConfirmModal'
import { RoleGate } from '@presentation/components/RoleGate'

type ClusteringParams = {
  dataset: string
  window: string
  algorithm: string
}

const DEFAULT_PARAMS: ClusteringParams = {
  dataset: '2025-Q4-Seeding',
  window: 'Rolling 90 hari',
  algorithm: 'k-means-v2',
}

const STEP_SEQUENCE = [
  { key: 'prepare', label: 'Menyiapkan dataset' },
  { key: 'features', label: 'Membangun fitur' },
  { key: 'cluster', label: 'Menjalankan clustering' },
  { key: 'rank', label: 'Mengurutkan prioritas' },
]

type StepKey = (typeof STEP_SEQUENCE)[number]['key']
type StepStatus = 'idle' | 'active' | 'done' | 'error'

function createStepState(initial: StepStatus): Record<StepKey, StepStatus> {
  return STEP_SEQUENCE.reduce((acc, step) => {
    acc[step.key] = initial
    return acc
  }, {} as Record<StepKey, StepStatus>)
}

type Filters = {
  priority: 'ALL' | 'RENDAH' | 'SEDANG' | 'TINGGI'
  status: 'ALL' | ClusteringCandidate['status']
  search: string
}

export default function ClusteringPage() {
  const session = getSession()
  const snapshot = useDataSnapshot()
  const runs = snapshot.clusteringRuns
  const [params, setParams] = useState<ClusteringParams>(DEFAULT_PARAMS)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(runs[0]?.id ?? null)
  const [stage, setStage] = useState<'idle' | 'queued' | 'running' | 'completed'>('idle')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({ priority: 'ALL', status: 'ALL', search: '' })
  const [approvalTarget, setApprovalTarget] = useState<{ runId: string; candidateId: string } | null>(null)
  const [stepState, setStepState] = useState<Record<StepKey, StepStatus>>(() => createStepState('idle'))
  const timers = useRef<number[]>([])

  useEffect(() => () => {
    timers.current.forEach(id => clearTimeout(id))
    timers.current = []
  }, [])

  useEffect(() => {
    if (!runs.length) {
      setSelectedRunId(null)
      return
    }
    if (!selectedRunId || !runs.some(run => run.id === selectedRunId)) {
      setSelectedRunId(runs[0].id)
    }
  }, [runs, selectedRunId])

  const selectedRun = runs.find(r => r.id === selectedRunId) ?? runs[0] ?? null
  const tkss = useMemo(() => snapshot.users.filter(u => u.role === 'TKSK'), [snapshot.users])
  const canTrigger = session?.role === 'ADMIN' || session?.role === 'RISK'
  const canAssign = session?.role === 'ADMIN' || session?.role === 'RISK'
  const canApprove = session?.role === 'TKSK'

  const filteredCandidates = useMemo(() => {
    if (!selectedRun) return []
    return selectedRun.results.filter(candidate => {
      if (session?.role === 'TKSK') {
        if (!candidate.assignedTo || candidate.assignedTo !== session.userId) return false
      }
      if (filters.priority !== 'ALL' && candidate.priority !== filters.priority) return false
      if (filters.status !== 'ALL' && candidate.status !== filters.status) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!candidate.name.toLowerCase().includes(q) && !candidate.nik_mask.includes(q)) return false
      }
      return true
    })
  }, [selectedRun, filters, session?.role, session?.userId])

  async function handleTrigger() {
    if (!canTrigger || busy) return
    setBusy(true)
    setError(null)
    clearTimers()
    setStepState(() => {
      const initial = createStepState('idle')
      initial[STEP_SEQUENCE[0].key] = 'active'
      return initial
    })
    setStage('queued')
    timers.current.push(window.setTimeout(() => setStage('running'), 200))
    STEP_SEQUENCE.forEach((step, idx) => {
      if (idx === 0) return
      timers.current.push(
        window.setTimeout(() => {
          setStepState(prev => {
            const next = { ...prev }
            const prevKey = STEP_SEQUENCE[idx - 1].key
            next[prevKey] = 'done'
            next[step.key] = 'active'
            return next
          })
        }, 350 * idx + Math.random() * 200)
      )
    })
    try {
      await BackofficeAPI.triggerClusteringRun({
        operator: session?.userId ?? 'system',
        parameters: params,
      })
      await Data.syncFromServer()
      setSelectedRunId(prev => prev ?? runs[0]?.id ?? null)
      setStage('completed')
      setStepState(() => createStepState('done'))
      Toast.show('Clustering berhasil dijalankan')
      clearTimers()
      setTimeout(() => setStage('idle'), 1500)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      setStage('idle')
      setStepState(prev => {
        const next = { ...prev }
        const active = STEP_SEQUENCE.find(step => prev[step.key] === 'active')?.key
        if (active) next[active] = 'error'
        return next
      })
      Toast.show('Clustering gagal: ' + message, 'error')
    } finally {
      clearTimers()
      setBusy(false)
    }
  }

  function clearTimers() {
    timers.current.forEach(id => clearTimeout(id))
    timers.current = []
  }

  async function handleAssign(runId: string, candidateId: string, tkskId: string) {
    try {
      await BackofficeAPI.assignClusteringCandidate(runId, candidateId, {
        actor: session?.userId ?? 'system',
        tkskId,
      })
      await Data.syncFromServer()
      Toast.show(`Kandidat dikirim ke ${tkskId}`)
    } catch (err) {
      Toast.show('Gagal assign: ' + (err as Error).message, 'error')
    }
  }

  async function handleApprovalConfirm(notes: string) {
    if (!approvalTarget) return
    try {
      await BackofficeAPI.updateClusteringCandidateStatus(approvalTarget.runId, approvalTarget.candidateId, {
        actor: session?.userId ?? 'TKSK',
        status: 'APPROVED',
        notes,
      })
      await Data.syncFromServer()
      Toast.show('Kandidat disetujui TKSK')
    } catch (err) {
      Toast.show('Gagal update status: ' + (err as Error).message, 'error')
    } finally {
      setApprovalTarget(null)
    }
  }

  return (
    <div className="space-y-5" aria-live="polite">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold">Clustering Bantuan Sosial</h2>
        <p className="text-sm text-slate-600">
          Jalankan rekomendasi jenis bansos untuk calon penerima, assign ke TKSK, dan pantau proses review.
        </p>
      </header>

      {(session?.role === 'ADMIN' || session?.role === 'RISK') && (
        <section className="bg-white border rounded p-4 space-y-4" aria-label="Trigger clustering">
          <div className="grid md:grid-cols-3 gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span>Dataset</span>
            <select className="border rounded p-2" value={params.dataset} onChange={e => setParams(p => ({ ...p, dataset: e.target.value }))}>
              <option value="2025-Q4-Seeding">2025-Q4 Seeding</option>
              <option value="2025-Q3-Refresh">2025-Q3 Refresh</option>
              <option value="Pilot-Batam">Pilot Batam (40k records)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span>Window</span>
            <select className="border rounded p-2" value={params.window} onChange={e => setParams(p => ({ ...p, window: e.target.value }))}>
              <option value="Rolling 90 hari">Rolling 90 hari</option>
              <option value="Rolling 180 hari">Rolling 180 hari</option>
              <option value="Snapshot bulanan">Snapshot bulanan</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span>Algoritma</span>
            <select className="border rounded p-2" value={params.algorithm} onChange={e => setParams(p => ({ ...p, algorithm: e.target.value }))}>
              <option value="k-means-v2">K-Means v2</option>
              <option value="dbscan-v1">DBSCAN v1</option>
              <option value="xgboost-mix">XGBoost Mix</option>
            </select>
          </label>
        </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Status job: <JobStage stage={stage} />
            </div>
            <button
              className="px-4 py-2 border rounded bg-blue-600 text-white disabled:opacity-50"
              onClick={handleTrigger}
              disabled={busy}
            >
              {busy ? 'Memproses…' : 'Run Clustering'}
            </button>
          </div>

          {error && (
            <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded p-3" role="alert">
              Gagal menjalankan clustering: {error}. Coba ulangi.
            </div>
          )}
          <StepTimeline state={stepState} />
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="bg-white border rounded p-3 space-y-3" aria-label="Riwayat clustering">
          <h3 className="font-medium">Riwayat Eksekusi</h3>
          <div className="space-y-2 max-h-[320px] overflow-auto" role="list">
            {runs.map(run => (
              <button
                key={run.id}
                role="listitem"
                className={`w-full text-left border rounded p-2 text-xs ${selectedRun?.id === run.id ? 'bg-blue-50 border-blue-400' : 'bg-white'}`}
                onClick={() => setSelectedRunId(run.id)}
              >
                <div className="font-semibold">{run.parameters.dataset}</div>
                <div>{new Date(run.startedAt).toLocaleString('id-ID')}</div>
                <div>Total kandidat: {run.summary.total}</div>
              </button>
            ))}
            {runs.length === 0 && <p className="text-sm text-slate-500">Belum ada job clustering.</p>}
          </div>
        </aside>

        <section className="space-y-3" aria-label="Detil clustering">
          {!selectedRun ? (
            <p className="text-sm text-slate-500">Pilih salah satu run untuk melihat detail.</p>
          ) : (
            <div className="space-y-4">
              <div className="bg-white border rounded p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-medium">Detil Run</h3>
                    <p className="text-xs text-slate-500">{selectedRun.parameters.dataset} · {selectedRun.parameters.window} · {selectedRun.parameters.algorithm}</p>
                  </div>
                  <div className="text-xs text-slate-500">
                    Operator: {selectedRun.operator} · {new Date(selectedRun.startedAt).toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <SummaryCard label="Total" value={selectedRun.summary.total} color="bg-slate-100" />
                  <SummaryCard label="Prioritas Tinggi" value={selectedRun.summary.tinggi} color="bg-emerald-100" />
                  <SummaryCard label="Prioritas Sedang" value={selectedRun.summary.sedang} color="bg-amber-100" />
                  <SummaryCard label="Prioritas Rendah" value={selectedRun.summary.rendah} color="bg-slate-200" />
                </div>
              </div>

              <div className="bg-white border rounded p-4 space-y-3" aria-label="Filter kandidat">
                <div className="grid md:grid-cols-4 gap-3 text-sm">
                  <label className="flex flex-col gap-1">
                    <span>Prioritas</span>
                    <select className="border rounded p-2" value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value as Filters['priority'] }))}>
                      <option value="ALL">Semua</option>
                      <option value="TINGGI">Tinggi</option>
                      <option value="SEDANG">Sedang</option>
                      <option value="RENDAH">Rendah</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span>Status</span>
                    <select className="border rounded p-2" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value as Filters['status'] }))}>
                      <option value="ALL">Semua</option>
                      <option value="PENDING_REVIEW">Pending review</option>
                      <option value="IN_REVIEW">Sedang ditinjau</option>
                      <option value="APPROVED">Disetujui TKSK</option>
                    </select>
                  </label>
                  <label className="md:col-span-2 flex flex-col gap-1">
                    <span>Cari nama / NIK</span>
                    <input className="border rounded p-2" value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} placeholder="Misal: Siti / 1234" />
                  </label>
                </div>
                <div className="overflow-auto" role="region" aria-label="Tabel kandidat clustering">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="text-left p-2">Nama</th>
                        <th className="text-left p-2">Cluster</th>
                        <th className="text-left p-2">Skor</th>
                        <th className="text-left p-2">Tanggungan</th>
                        <th className="text-left p-2">Wilayah</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Assigned</th>
                        <th className="text-left p-2">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCandidates.map(candidate => (
                        <tr key={candidate.id} className="border-b last:border-b-0">
                          <td className="p-2">
                            <div className="font-medium">{candidate.name}</div>
                            <div className="text-xs text-slate-500">{candidate.nik_mask}</div>
                          </td>
                          <td className="p-2">
                            <span className="block text-xs text-slate-500">{candidate.cluster}</span>
                            {/* <PriorityBadge priority={candidate.priority} /> */}
                          </td>
                          <td className="p-2">{candidate.score}</td>
                          <td className="p-2">{candidate.beneficiaries}</td>
                          <td className="p-2 text-xs text-slate-500">{candidate.region.kab} / {candidate.region.kec}</td>
                          <td className="p-2"><StatusBadge status={candidate.status} /></td>
                          <td className="p-2 text-xs text-slate-500">{candidate.assignedTo ?? '-'}</td>
                          <td className="p-2">
                            <div className="flex flex-col gap-2">
                              {(session?.role === 'ADMIN' || session?.role === 'RISK') && (
                                <AssignControl
                                  disabled={!canAssign}
                                  candidate={candidate}
                                  runId={selectedRun.id}
                                  onAssign={handleAssign}
                                  options={tkss.map(u => u.id)}
                                />
                              )}
                              {(session?.role === 'TKSK' && candidate.status !== 'APPROVED' && candidate.assignedTo === session?.userId) && (
                                <button
                                  className="px-3 py-1 border rounded text-xs"
                                  onClick={() => setApprovalTarget({ runId: selectedRun.id, candidateId: candidate.id })}
                                >
                                  Setujui TKSK
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredCandidates.length === 0 && <p className="text-sm text-slate-500 p-2">Tidak ada kandidat sesuai filter.</p>}
                </div>
              </div>
            </div>
          )}
        </section>
      </section>

      {approvalTarget && (
        <ConfirmModal
          title="Setujui kandidat"
          min={5}
          onCancel={() => setApprovalTarget(null)}
          onConfirm={handleApprovalConfirm}
        />
      )}
    </div>
  )
}

function JobStage({ stage }: { stage: 'idle' | 'queued' | 'running' | 'completed' }) {
  const labels: Record<typeof stage, string> = {
    idle: 'Idle',
    queued: 'Menunggu eksekusi',
    running: 'Sedang memproses',
    completed: 'Selesai',
  }
  const colors: Record<typeof stage, string> = {
    idle: 'bg-slate-200 text-slate-700',
    queued: 'bg-amber-100 text-amber-700',
    running: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
  }
  return <span className={`px-2 py-1 rounded ${colors[stage]}`}>{labels[stage]}</span>
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded p-3 ${color}`}>
      <div className="text-xs text-slate-600">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  )
}

function StepTimeline({ state }: { state: Record<StepKey, StepStatus> }) {
  return (
    <ol className="grid md:grid-cols-4 gap-3 text-xs">
      {STEP_SEQUENCE.map(step => {
        const status = state[step.key]
        const map: Record<StepStatus, { badge: string; dot: string }> = {
          idle: { badge: 'bg-slate-100 text-slate-500', dot: 'bg-slate-300' },
          active: { badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500 animate-pulse' },
          done: { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
          error: { badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
        }
        const meta = map[status]
        return (
          <li key={step.key} className={`rounded p-2 border flex items-center gap-2 ${status === 'idle' ? 'border-slate-200' : 'border-current'}`}>
            <span className={`w-2 h-2 rounded-full ${meta.dot}`} aria-hidden="true" />
            <div>
              <div className={`inline-block rounded px-2 py-0.5 mb-1 ${meta.badge}`}>{statusLabel(status)}</div>
              <div className="font-medium text-slate-700">{step.label}</div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function statusLabel(status: StepStatus) {
  switch (status) {
    case 'idle': return 'Belum mulai'
    case 'active': return 'Sedang berjalan'
    case 'done': return 'Selesai'
    case 'error': return 'Gagal'
    default: return status
  }
}

function PriorityBadge({ priority }: { priority: ClusteringCandidate['priority'] }) {
  const colors: Record<ClusteringCandidate['priority'], string> = {
    RENDAH: 'bg-slate-200 text-slate-700',
    SEDANG: 'bg-amber-100 text-amber-700',
    TINGGI: 'bg-emerald-100 text-emerald-700',
  }
  return <span className={`px-2 py-1 rounded text-xs font-medium ${colors[priority]}`}>{priority}</span>
}

function StatusBadge({ status }: { status: ClusteringCandidate['status'] }) {
  const map: Record<ClusteringCandidate['status'], { label: string; className: string }> = {
    PENDING_REVIEW: { label: 'Pending review', className: 'bg-slate-200 text-slate-700' },
    IN_REVIEW: { label: 'Sedang ditinjau', className: 'bg-amber-100 text-amber-700' },
    APPROVED: { label: 'Disetujui TKSK', className: 'bg-emerald-100 text-emerald-700' },
  }
  const meta = map[status]
  return <span className={`px-2 py-1 rounded text-xs font-medium ${meta.className}`}>{meta.label}</span>
}

function AssignControl({
  candidate,
  runId,
  onAssign,
  options,
  disabled,
}: {
  candidate: ClusteringCandidate
  runId: string
  onAssign: (runId: string, candidateId: string, tkskId: string) => void
  options: string[]
  disabled: boolean
}) {
  const [value, setValue] = useState<string>('')
  return (
    <div className="flex items-center gap-2 text-xs">
      <select
        className="border rounded p-1 flex-1"
        value={value || candidate.assignedTo || ''}
        onChange={e => {
          const newValue = e.target.value
          setValue(newValue)
          if (newValue) onAssign(runId, candidate.id, newValue)
        }}
        disabled={disabled}
      >
        <option value="">Assign TKSK…</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  )
}
