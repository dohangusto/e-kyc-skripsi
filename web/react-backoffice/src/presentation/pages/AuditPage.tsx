import { useMemo, useState } from 'react'
import { useDataSnapshot } from '@application/services/useDataSnapshot'
import { Toast } from '@presentation/components/Toast'

export default function AuditPage() {
  const audit = useDataSnapshot().audit.slice().reverse()
  const [filters, setFilters] = useState({ entity: '', actor: '', from: '', to: '' })
  const filtered = useMemo(() => {
    return audit.filter(entry => {
      if (filters.entity && !entry.entity.includes(filters.entity)) return false
      if (filters.actor && !entry.actor.includes(filters.actor)) return false
      if (filters.from && new Date(entry.at).getTime() < new Date(filters.from).getTime()) return false
      if (filters.to && new Date(entry.at).getTime() > new Date(filters.to).getTime()) return false
      return true
    })
  }, [audit, filters])

  function exportJson() {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
    Toast.show('Audit log diexport')
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Audit Viewer</h2>
      <div className="bg-white border rounded p-3 space-y-3">
        <div className="grid md:grid-cols-4 gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span>Entity</span>
            <input className="border rounded p-2" value={filters.entity} onChange={e => setFilters(f => ({ ...f, entity: e.target.value }))} />
          </label>
          <label className="flex flex-col gap-1">
            <span>Actor</span>
            <input className="border rounded p-2" value={filters.actor} onChange={e => setFilters(f => ({ ...f, actor: e.target.value }))} />
          </label>
          <label className="flex flex-col gap-1">
            <span>Dari</span>
            <input type="date" className="border rounded p-2" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
          </label>
          <label className="flex flex-col gap-1">
            <span>Sampai</span>
            <input type="date" className="border rounded p-2" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
          </label>
        </div>
        <button className="px-3 py-1 border rounded" onClick={exportJson}>Export JSON</button>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr><th className="text-left p-2">At</th><th className="text-left p-2">Actor</th><th className="text-left p-2">Entity</th><th className="text-left p-2">Action</th><th className="text-left p-2">Reason</th></tr>
            </thead>
            <tbody>
              {filtered.map((entry, i) => (
                <tr key={`${entry.at}-${i}`}>
                  <td className="p-2 text-xs text-slate-500">{new Date(entry.at).toLocaleString('id-ID')}</td>
                  <td className="p-2">{entry.actor}</td>
                  <td className="p-2">{entry.entity}</td>
                  <td className="p-2">{entry.action}</td>
                  <td className="p-2 text-xs text-slate-500">{entry.reason || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-sm text-slate-500 mt-2">Tidak ada log sesuai filter.</p>}
        </div>
      </div>
    </div>
  )
}
