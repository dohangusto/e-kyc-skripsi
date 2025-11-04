import { useMemo, useState } from 'react'
import { Data } from '@application/services/data-service'
import { getSession } from '@shared/session'
import { VisitManager } from '@presentation/components/VisitManager'
import type { Application, Visit } from '@domain/types'

export default function TkskPage() {
  const session = getSession()
  const [snapshot, setSnapshot] = useState(Data.get())
  const queue = useMemo(
    () => snapshot.applications.filter(app =>
      (app.status === 'DESK_REVIEW' || app.status === 'FIELD_VISIT') &&
      (session?.regionScope?.some(scope => app.region.kec.includes(scope) || app.region.kab.includes(scope)) ?? true)
    ),
    [snapshot, session],
  )
  const [selectedId, setSelectedId] = useState<string | null>(queue[0]?.id ?? null)
  const selected = queue.find(a => a.id === selectedId) ?? queue[0] ?? null
  const calendar = useMemo(() => buildCalendar(snapshot.applications), [snapshot])

  function refresh() {
    setSnapshot(Data.refresh())
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">TKSK Console</h2>
      <section className="grid md:grid-cols-5 gap-4">
        <aside className="md:col-span-2 bg-white border rounded p-3" aria-label="My Queue">
          <h3 className="font-medium mb-2">My Queue ({queue.length})</h3>
          <div className="space-y-2 max-h-[400px] overflow-auto" role="list">
            {queue.map(app => (
              <button
                role="listitem"
                key={app.id}
                className={`w-full text-left border rounded p-2 text-xs ${selected?.id === app.id ? 'bg-blue-50 border-blue-400' : 'bg-white'}`}
                onClick={() => setSelectedId(app.id)}
              >
                <div className="font-semibold">{app.id}</div>
                <div>{app.applicant.name}</div>
                <div>{app.region.kec}</div>
              </button>
            ))}
            {queue.length === 0 && <p className="text-sm text-slate-500">Tidak ada aplikasi dalam antrian wilayah Anda.</p>}
          </div>
        </aside>

        <section className="md:col-span-3 bg-white border rounded p-3" aria-live="polite">
          {selected ? (
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold">{selected.id}</h3>
                <p className="text-sm text-slate-500">{selected.applicant.name} · {selected.region.kec}</p>
              </div>
              <VisitManager app={selected} onChange={refresh} />
            </div>
          ) : (
            <p className="text-sm text-slate-500">Pilih aplikasi untuk melihat kunjungan.</p>
          )}
        </section>
      </section>

      <section className="bg-white border rounded p-3" aria-label="Visit Calendar">
        <h3 className="font-medium mb-2">Calendar</h3>
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          {calendar.length === 0 && <p className="text-slate-500">Belum ada jadwal kunjungan.</p>}
          {calendar.map(item => (
            <div key={item.date} className="border rounded p-2">
              <div className="font-medium">{item.date}</div>
              <ul className="mt-1 space-y-1">
                {item.visits.map(v => (
                  <li key={v.id} className="flex justify-between">
                    <span>{v.id}</span>
                    <span>{v.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function buildCalendar(apps: Application[]): Array<{ date: string; visits: Array<Visit & { appId: string }> }> {
  const map = new Map<string, Array<Visit & { appId: string }>>()
  apps.forEach(app => {
    app.visits.forEach(visit => {
      const date = visit.scheduled_at.split('T')[0]
      const arr = map.get(date) ?? []
      arr.push({ ...visit, appId: app.id })
      map.set(date, arr)
    })
  })
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, visits]) => ({ date, visits }))
}
