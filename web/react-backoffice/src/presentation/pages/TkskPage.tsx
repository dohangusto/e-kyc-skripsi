import { useEffect, useMemo, useState } from 'react'
import { useDataSnapshot } from '@application/services/useDataSnapshot'
import { getSession } from '@shared/session'
import { VisitManager } from '@presentation/components/VisitManager'
import type { Application, Visit } from '@domain/types'
import { PageIntro } from '@presentation/components/PageIntro'

export default function TkskPage() {
  const session = getSession()
  if (!session || session.role !== 'TKSK') {
    return <div className="text-sm text-slate-600">Halaman ini hanya untuk pengguna TKSK.</div>
  }
  const snapshot = useDataSnapshot()
  const queue = useMemo(
    () => snapshot.applications.filter(app =>
      app.assigned_to === session.userId &&
      ['DESK_REVIEW', 'FIELD_VISIT', 'RETURNED_FOR_REVISION'].includes(app.status)
    ),
    [snapshot, session],
  )
  const [selectedId, setSelectedId] = useState<string | null>(queue[0]?.id ?? null)
  const selected = queue.find(a => a.id === selectedId) ?? queue[0] ?? null

  const PAGE_SIZE = 5
  const [queuePage, setQueuePage] = useState(0)
  const queueTotalPages = Math.max(1, Math.ceil(queue.length / PAGE_SIZE))
  const queueSlice = queue.slice(queuePage * PAGE_SIZE, queuePage * PAGE_SIZE + PAGE_SIZE)

  useEffect(() => {
    setQueuePage(prev => (prev >= queueTotalPages ? queueTotalPages - 1 : prev))
  }, [queueTotalPages])

  useEffect(() => {
    if (!queue.length) {
      setSelectedId(null)
      return
    }
    if (!selected) {
      setSelectedId(queue[0].id)
    }
  }, [queue, selected])

  useEffect(() => {
    if (!selectedId) return
    const idx = queue.findIndex(app => app.id === selectedId)
    if (idx === -1) return
    const pageOfSelected = Math.floor(idx / PAGE_SIZE)
    if (pageOfSelected !== queuePage) {
      setQueuePage(pageOfSelected)
    }
  }, [selectedId, queue])

  const CALENDAR_PAGE_SIZE = 5
  const calendarEntries = useMemo(
    () => buildCalendar(snapshot.visits, snapshot.applications, session.userId),
    [snapshot.visits, snapshot.applications, session.userId],
  )
  const [calendarPage, setCalendarPage] = useState(0)
  const calendarTotalPages = Math.max(1, Math.ceil(calendarEntries.length / CALENDAR_PAGE_SIZE))
  const calendarSlice = calendarEntries.slice(calendarPage * CALENDAR_PAGE_SIZE, calendarPage * CALENDAR_PAGE_SIZE + CALENDAR_PAGE_SIZE)

  useEffect(() => {
    setCalendarPage(prev => (prev >= calendarTotalPages ? calendarTotalPages - 1 : prev))
  }, [calendarTotalPages])

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">TKSK Console</h2>
      <PageIntro>Lihat antrian kasus yang ditugaskan dan kalender kunjungan Anda selama 30 hari ke depan.</PageIntro>
      <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <aside className="bg-white border rounded p-3 space-y-3" aria-label="My Queue">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-medium">My Queue ({queue.length})</h3>
              {queue.length > PAGE_SIZE && (
                <PaginationControls
                  page={queuePage}
                  totalPages={queueTotalPages}
                  onPrev={() => setQueuePage(p => Math.max(0, p - 1))}
                  onNext={() => setQueuePage(p => Math.min(queueTotalPages - 1, p + 1))}
                />
              )}
            </div>
            <div className="space-y-2 text-xs" role="list">
              {queueSlice.map(app => (
                <button
                  role="listitem"
                  key={app.id}
                  className={`w-full text-left border rounded p-2 ${selected?.id === app.id ? 'bg-blue-50 border-blue-400' : 'bg-white'}`}
                  onClick={() => setSelectedId(app.id)}
                >
                  <div className="font-semibold">{app.id}</div>
                  <div>{app.applicant.name}</div>
                  <div>{app.region.kec}</div>
                </button>
              ))}
              {queue.length === 0 && <p className="text-sm text-slate-500">Tidak ada aplikasi dalam antrian Anda.</p>}
            </div>
          </aside>

          <section className="bg-white border rounded p-3 space-y-3" aria-label="Visit Calendar">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-medium">Calendar</h3>
              {calendarEntries.length > CALENDAR_PAGE_SIZE && (
                <PaginationControls
                  page={calendarPage}
                  totalPages={calendarTotalPages}
                  onPrev={() => setCalendarPage(p => Math.max(0, p - 1))}
                  onNext={() => setCalendarPage(p => Math.min(calendarTotalPages - 1, p + 1))}
                />
              )}
            </div>
            <div className="space-y-3 text-sm">
              {calendarSlice.length === 0 && <p className="text-slate-500">Belum ada jadwal dalam 30 hari ke depan.</p>}
              {calendarSlice.map(item => (
                <div key={item.date} className="border rounded p-2">
                  <div className="font-medium">{item.date}</div>
                  <ul className="mt-1 space-y-1">
                    {item.visits.map(v => (
                      <li key={v.id} className="flex justify-between">
                        <span>{v.appName} · {v.id}</span>
                        <span>{v.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="bg-white border rounded p-3" aria-live="polite">
          {selected ? (
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold">{selected.id}</h3>
                <p className="text-sm text-slate-500">{selected.applicant.name} · {selected.region.kec}</p>
              </div>
              <VisitManager app={selected} />
            </div>
          ) : (
            <p className="text-sm text-slate-500">Pilih aplikasi untuk melihat kunjungan.</p>
          )}
        </section>
      </section>
    </div>
  )
}

function buildCalendar(visits: Visit[], apps: Application[], tkskId: string): Array<{ date: string; visits: Array<{ id: string; status: Visit['status']; scheduled_at: string; application_id: string; appName: string }> }> {
  const appLookup = new Map(apps.map(app => [app.id, app] as const))
  const map = new Map<string, Array<{ id: string; status: Visit['status']; scheduled_at: string; application_id: string; appName: string }>>()
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const horizon = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
  visits.forEach(visit => {
    if (visit.tksk_id && visit.tksk_id !== tkskId) return
    const date = visit.scheduled_at.split('T')[0]
    const visitDate = new Date(date)
    if (visitDate < today || visitDate > horizon) return
    const app = appLookup.get(visit.application_id)
    const arr = map.get(date) ?? []
    arr.push({
      id: visit.id,
      status: visit.status,
      scheduled_at: visit.scheduled_at,
      application_id: visit.application_id,
      appName: app?.applicant.name ?? visit.application_id,
    })
    map.set(date, arr)
  })
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, grouped]) => ({ date, visits: grouped }))
}

function PaginationControls({ page, totalPages, onPrev, onNext }: { page: number; totalPages: number; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <button className="px-2 py-1 border rounded disabled:opacity-40" onClick={onPrev} disabled={page === 0}>
        Prev
      </button>
      <span>{page + 1} / {totalPages}</span>
      <button className="px-2 py-1 border rounded disabled:opacity-40" onClick={onNext} disabled={page >= totalPages - 1}>
        Next
      </button>
    </div>
  )
}
