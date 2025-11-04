import { useEffect, useMemo, useState } from 'react'
import { Data } from '@application/services/data-service'
import { AppRouter } from '@app/router'
import { StatusPill } from '@presentation/components/StatusPill'
import { ScoreBadge } from '@presentation/components/ScoreBadge'
import { SavedViews } from '@shared/saved-views'

type Filters = {
  statuses: string[]
  region: string
  scoreMin: number | null
  scoreMax: number | null
  flaggedOnly: boolean
  assigned: string
  dateFrom: string
  dateTo: string
  search: string
  agingOver: number | null
}

const STATUS_OPTIONS = ['DRAFT','SUBMITTED','DESK_REVIEW','FIELD_VISIT','FINAL_APPROVED','FINAL_REJECTED','RETURNED_FOR_REVISION','DISBURSEMENT_READY','DISBURSED','DISBURSEMENT_FAILED']

function parseParams(q: URLSearchParams): Filters {
  return {
    statuses: q.getAll('status'),
    region: q.get('region') || '',
    scoreMin: q.get('scoreMin') ? Number(q.get('scoreMin')) : null,
    scoreMax: q.get('scoreMax') ? Number(q.get('scoreMax')) : null,
    flaggedOnly: q.get('flagged') === '1',
    assigned: q.get('assigned') || '',
    dateFrom: q.get('from') || '',
    dateTo: q.get('to') || '',
    search: q.get('search') || '',
    agingOver: q.get('aging') ? Number(q.get('aging')) : null,
  }
}

function toParams(f: Filters) {
  const q = new URLSearchParams()
  f.statuses.forEach(s => q.append('status', s))
  if (f.region) q.set('region', f.region)
  if (f.scoreMin !== null) q.set('scoreMin', String(f.scoreMin))
  if (f.scoreMax !== null) q.set('scoreMax', String(f.scoreMax))
  if (f.flaggedOnly) q.set('flagged', '1')
  if (f.assigned) q.set('assigned', f.assigned)
  if (f.dateFrom) q.set('from', f.dateFrom)
  if (f.dateTo) q.set('to', f.dateTo)
  if (f.search) q.set('search', f.search)
  if (f.agingOver !== null) q.set('aging', String(f.agingOver))
  return q
}

export default function ApplicationsPage() {
  const [filters, setFilters] = useState<Filters>(() => parseParams(new URLSearchParams(window.location.search)))
  const [simulate, setSimulate] = useState<'normal'|'empty'|'error'>('normal')
  const [views, setViews] = useState(SavedViews.all())
  const [viewName, setViewName] = useState('')

  useEffect(() => {
    const q = toParams(filters)
    const next = `/applications${q.toString() ? `?${q}` : ''}`
    AppRouter.navigate(next, { replace: true })
  }, [filters])

  const db = Data.get()
  const regions = useMemo(() => {
    const set = new Set<string>()
    db.applications.forEach(a => set.add(`${a.region.kab} / ${a.region.kec}`))
    return Array.from(set).sort()
  }, [db])
  const assignees = useMemo(() => {
    const set = new Set<string>()
    db.applications.forEach(a => a.assigned_to && set.add(a.assigned_to))
    return Array.from(set).sort()
  }, [db])

  const rows = useMemo(() => {
    if (simulate === 'error') return null
    let r = db.applications.slice()
    if (filters.statuses.length) r = r.filter(a => filters.statuses.includes(a.status))
    if (filters.region) {
      r = r.filter(a => `${a.region.kab} / ${a.region.kec}` === filters.region)
    }
    if (filters.flaggedOnly) {
      r = r.filter(a => a.flags.duplicate_face || a.flags.duplicate_nik || a.flags.device_anomaly)
    }
    if (filters.assigned) r = r.filter(a => a.assigned_to === filters.assigned)
    if (filters.scoreMin !== null) r = r.filter(a => a.scores.ocr >= filters.scoreMin || a.scores.face >= filters.scoreMin)
    if (filters.scoreMax !== null) r = r.filter(a => a.scores.ocr <= filters.scoreMax && a.scores.face <= filters.scoreMax)
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom).getTime()
      r = r.filter(a => new Date(a.created_at).getTime() >= from)
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo).getTime()
      r = r.filter(a => new Date(a.created_at).getTime() <= to)
    }
    if (filters.search) {
      const s = filters.search.toLowerCase()
      r = r.filter(a => a.applicant.name.toLowerCase().includes(s) || a.applicant.nik_mask.includes(s))
    }
    if (filters.agingOver !== null) {
      r = r.filter(a => a.aging_days > filters.agingOver)
    }
    if (simulate === 'empty') return []
    return r.slice(0, 200)
  }, [db, filters, simulate])

  function toggleStatus(status: string) {
    setFilters(f => {
      const has = f.statuses.includes(status)
      return { ...f, statuses: has ? f.statuses.filter(s => s !== status) : [...f.statuses, status] }
    })
  }

  function saveView() {
    if (!viewName.trim()) return
    const query = toParams(filters).toString()
    SavedViews.save(viewName.trim(), query)
    setViews(SavedViews.all())
    setViewName('')
  }

  function loadView(vId: string) {
    const v = views.find(v => v.id === vId)
    if (!v) return
    const q = new URLSearchParams(v.query)
    setFilters(parseParams(q))
  }

  return (
    <div className="space-y-4" aria-live="polite">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Applications</h2>
        <div className="flex gap-2">
          <button className={`px-3 py-1 border rounded ${simulate==='normal'?'bg-slate-200':''}`} onClick={() => setSimulate('normal')}>Normal</button>
          <button className={`px-3 py-1 border rounded ${simulate==='empty'?'bg-slate-200':''}`} onClick={() => setSimulate('empty')}>Simulate Empty</button>
          <button className={`px-3 py-1 border rounded ${simulate==='error'?'bg-slate-200':''}`} onClick={() => setSimulate('error')}>Simulate Error</button>
        </div>
      </div>

      <section className="bg-white border rounded p-3 space-y-3" aria-label="Filters">
        <div className="grid md:grid-cols-3 gap-3">
          <label className="text-sm flex flex-col gap-1">
            <span>Search (NIK / Nama)</span>
            <input className="border rounded p-2" value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
          </label>
          <label className="text-sm flex flex-col gap-1">
            <span>Region</span>
            <select className="border rounded p-2" value={filters.region} onChange={e => setFilters(f => ({ ...f, region: e.target.value }))}>
              <option value="">All</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label className="text-sm flex flex-col gap-1">
            <span>Assigned To</span>
            <select className="border rounded p-2" value={filters.assigned} onChange={e => setFilters(f => ({ ...f, assigned: e.target.value }))}>
              <option value="">Any</option>
              {assignees.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
        </div>

        <div className="grid md:grid-cols-4 gap-3">
          <fieldset className="text-sm">
            <legend className="font-medium">Status</legend>
            <div className="flex flex-wrap gap-2 mt-2" role="group" aria-label="Status filters">
              {STATUS_OPTIONS.map(status => (
                <label key={status} className="text-xs border rounded px-2 py-1 flex items-center gap-1">
                  <input type="checkbox" checked={filters.statuses.includes(status)} onChange={() => toggleStatus(status)} />
                  {status}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="text-sm flex flex-col gap-1">
            <span>Score Min</span>
            <input type="number" min={0} max={1} step={0.01} className="border rounded p-2" value={filters.scoreMin ?? ''} onChange={e => setFilters(f => ({ ...f, scoreMin: e.target.value ? Number(e.target.value) : null }))} />
          </label>
          <label className="text-sm flex flex-col gap-1">
            <span>Score Max</span>
            <input type="number" min={0} max={1} step={0.01} className="border rounded p-2" value={filters.scoreMax ?? ''} onChange={e => setFilters(f => ({ ...f, scoreMax: e.target.value ? Number(e.target.value) : null }))} />
          </label>
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={filters.flaggedOnly} onChange={e => setFilters(f => ({ ...f, flaggedOnly: e.target.checked }))} />
            Flagged Only
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-sm flex flex-col gap-1">
            <span>Created From</span>
            <input type="date" className="border rounded p-2" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} />
          </label>
          <label className="text-sm flex flex-col gap-1">
            <span>Created To</span>
            <input type="date" className="border rounded p-2" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} />
          </label>
          <label className="text-sm flex flex-col gap-1">
            <span>Aging &gt;</span>
            <input type="number" min={0} className="border rounded p-2" value={filters.agingOver ?? ''} onChange={e => setFilters(f => ({ ...f, agingOver: e.target.value ? Number(e.target.value) : null }))} />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <input className="border rounded p-2 text-sm" placeholder="Save view name" value={viewName} onChange={e => setViewName(e.target.value)} />
          <button className="px-3 py-1 border rounded" onClick={saveView}>Save View</button>
          {views.map(v => (
            <div key={v.id} className="flex items-center gap-1 text-xs border rounded px-2 py-1">
              <button onClick={() => loadView(v.id)} className="underline">{v.name}</button>
              <button onClick={() => { SavedViews.remove(v.id); setViews(SavedViews.all()) }} aria-label={`Remove saved view ${v.name}`}>✕</button>
            </div>
          ))}
        </div>
      </section>

      <div className="bg-white border rounded overflow-auto" role="region" aria-label="Applications table">
        {rows === null ? (
          <div className="p-6 text-sm text-rose-600">Simulated error: gagal memuat data.</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">Tidak ada data sesuai filter.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th scope="col" className="text-left p-2">ID</th>
                <th scope="col" className="text-left p-2">Nama</th>
                <th scope="col" className="text-left p-2">Wilayah</th>
                <th scope="col" className="text-left p-2">Status</th>
                <th scope="col" className="text-left p-2">Score</th>
                <th scope="col" className="text-left p-2">Flags</th>
                <th scope="col" className="text-left p-2">Assigned</th>
                <th scope="col" className="text-left p-2">Aging</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(a => (
                <tr key={a.id} className="hover:bg-slate-50 focus-within:bg-slate-100 cursor-pointer" tabIndex={0} onClick={() => AppRouter.navigate(`/applications/${a.id}`)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); AppRouter.navigate(`/applications/${a.id}`) } }}>
                  <td className="p-2 font-mono text-xs">{a.id}</td>
                  <td className="p-2">{a.applicant.name}</td>
                  <td className="p-2">{a.region.kab} / {a.region.kec}</td>
                  <td className="p-2"><StatusPill status={a.status} /></td>
                  <td className="p-2"><ScoreBadge ocr={a.scores.ocr} face={a.scores.face} /></td>
                  <td className="p-2 text-xs">{a.flags.duplicate_face? '👤dup ' : ''}{a.flags.duplicate_nik? '🆔dup ' : ''}{a.flags.device_anomaly? '📱anom' : ''}</td>
                  <td className="p-2">{a.assigned_to}</td>
                  <td className="p-2">{a.aging_days}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
