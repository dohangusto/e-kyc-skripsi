import { useMemo, useState } from 'react'
import { Data } from '@application/services/data-service'
import { useDataSnapshot } from '@application/services/useDataSnapshot'
import { getSession } from '@shared/session'
import { Toast } from '@presentation/components/Toast'
import { RoleGate } from '@presentation/components/RoleGate'
import { PageIntro } from '@presentation/components/PageIntro'

const STATUS_FLOW: Array<{ from: string; to: 'SIGNED' | 'EXPORTED' | 'SENT'; label: string }> = [
  { from: 'DRAFT', to: 'SIGNED', label: 'Mark Signed' },
  { from: 'SIGNED', to: 'EXPORTED', label: 'Mark Exported' },
  { from: 'EXPORTED', to: 'SENT', label: 'Mark Sent' },
]

export default function BatchesPage() {
  const snapshot = useDataSnapshot()
  const session = getSession()
  const readyApps = useMemo(
    () =>
      snapshot.applications
        .filter(app => app.status === 'FINAL_APPROVED')
        .map(app => ({ id: app.id, name: app.applicant.name, region: `${app.region.kab} / ${app.region.kec}` })),
    [snapshot.applications],
  )
  const [selected, setSelected] = useState<string[]>([])
  const [code, setCode] = useState(`BAT-${snapshot.config.period}-NEW`)
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null)
  const appsMap = useMemo(() => {
    const map = new Map<string, { name: string; region: string; status: string }>()
    snapshot.applications.forEach(app => {
      map.set(app.id, { name: app.applicant.name, region: `${app.region.kab} / ${app.region.kec}`, status: app.status })
    })
    return map
  }, [snapshot.applications])

  async function create() {
    try {
      if (!session) throw new Error('no-session')
      if (selected.length === 0) throw new Error('Pilih minimal satu aplikasi')
      await Data.createBatch(code, selected, session.userId)
      setSelected([])
      Toast.show('Batch created')
    } catch (e) {
      Toast.show('Gagal: ' + (e as Error).message, 'error')
    }
  }

  async function step(batchId: string, next: 'SIGNED' | 'EXPORTED' | 'SENT') {
    try {
      if (!session) throw new Error('no-session')
      await Data.setBatchStatus(batchId, next, session.userId)
      Toast.show(`Batch ${next}`)
    } catch (e) {
      Toast.show('Gagal: ' + (e as Error).message, 'error')
    }
  }

  function exportBatch(batchId: string, type: 'csv' | 'json') {
    const batch = snapshot.batches.find(b => b.id === batchId)
    if (!batch) return
    const data = batch.items.map(id => snapshot.applications.find(a => a.id === id))
    const fileName = `${batch.code}.${type}`
    let blob: Blob
    if (type === 'json') {
      blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    } else {
      const header = 'id,name,status,assigned_to\n'
      const rows = data.map(a => a ? `${a.id},"${a.applicant.name}",${a.status},${a.assigned_to}` : '').join('\n')
      blob = new Blob([header + rows], { type: 'text/csv' })
    }
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
    Toast.show(`Exported ${fileName}`)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Batches</h2>
      <PageIntro>Mengelompokkan pengajuan FINAL_APPROVED menjadi paket siap penyaluran.</PageIntro>
      <section className="bg-white border rounded p-3 space-y-3" aria-label="Create batch">
        <div className="text-sm">Pilih FINAL_APPROVED untuk buat batch simulasi.</div>
        <input className="border rounded p-2" value={code} onChange={e => setCode(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          {readyApps.map(app => (
            <label key={app.id} className="text-xs border rounded px-2 py-1 flex flex-col">
              <span className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={selected.includes(app.id)}
                  onChange={e =>
                    setSelected(prev =>
                      e.target.checked ? [...prev, app.id] : prev.filter(x => x !== app.id),
                    )
                  }
                />
                <span className="font-semibold">{app.name}</span>
              </span>
              <span className="text-[11px] text-slate-500">{app.region} · {app.id}</span>
            </label>
          ))}
          {readyApps.length === 0 && <p className="text-xs text-slate-500">Belum ada FINAL_APPROVED.</p>}
        </div>
        <RoleGate allow={['ADMIN']}>
          <button className="px-3 py-1 border rounded" onClick={create}>Generate Batch</button>
        </RoleGate>
      </section>

      <section className="bg-white border rounded p-3 space-y-3" aria-label="Batch list">
        <h3 className="font-medium">Daftar Batch</h3>
        <div className="space-y-3">
          {snapshot.batches.map(batch => {
            const flow = STATUS_FLOW.find(step => step.from === batch.status)
            const expanded = expandedBatchId === batch.id
            return (
              <div
                key={batch.id}
                className={`border rounded p-3 text-sm space-y-2 ${expanded ? 'bg-slate-50' : 'bg-white'}`}
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                onClick={event => {
                  const target = event.target as HTMLElement
                  if (target.closest('button, a, input')) return
                  setExpandedBatchId(prev => (prev === batch.id ? null : batch.id))
                }}
                onKeyDown={event => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  const target = event.target as HTMLElement
                  if (target.closest('button, a, input')) return
                  event.preventDefault()
                  setExpandedBatchId(prev => (prev === batch.id ? null : batch.id))
                }}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="font-semibold">{batch.code}</div>
                    <div className="text-xs text-slate-500">ID {batch.id} · {batch.items.length} items</div>
                  </div>
                  <span className="px-2 py-1 bg-slate-100 rounded text-xs">{batch.status}</span>
                </div>
                <div className="text-xs">Checksum: {batch.checksum}</div>
                <div className="flex flex-wrap gap-2">
                  <RoleGate allow={['ADMIN']}>
                    <button className="px-3 py-1 border rounded" onClick={() => exportBatch(batch.id, 'json')}>Export JSON</button>
                  </RoleGate>
                  <RoleGate allow={['ADMIN']}>
                    <button className="px-3 py-1 border rounded" onClick={() => exportBatch(batch.id, 'csv')}>Export CSV</button>
                  </RoleGate>
                  {flow && (
                    <RoleGate allow={['ADMIN']}>
                      <button className="px-3 py-1 border rounded" onClick={() => step(batch.id, flow.to)}>{flow.label}</button>
                    </RoleGate>
                  )}
                </div>
                {expanded && (
                  <div className="border-t pt-2 mt-2 space-y-2">
                    <h4 className="font-medium text-xs uppercase tracking-wide text-slate-500">Daftar Penerima</h4>
                    <ul className="space-y-1 text-xs">
                      {batch.items.map(itemId => {
                        const info = appsMap.get(itemId)
                        return (
                          <li key={itemId} className="border rounded p-2 bg-white flex justify-between gap-2">
                            <span>
                              <span className="font-semibold text-slate-700">{info?.name ?? 'Tidak ditemukan'}</span>
                              <span className="block text-slate-500">{itemId}{info ? ` · ${info.region}` : ''}</span>
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">{info?.status ?? 'UNKNOWN'}</span>
                          </li>
                        )
                      })}
                      {batch.items.length === 0 && <li className="italic text-slate-500">Belum ada penerima di batch ini.</li>}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
          {snapshot.batches.length === 0 && <p className="text-sm text-slate-500">Belum ada batch dibuat.</p>}
        </div>
      </section>
    </div>
  )
}
