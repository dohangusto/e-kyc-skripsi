import { useEffect, useMemo, useState } from 'react'
import { Data } from '@application/services/data-service'
import { AppRouter } from '@app/router'
import { getSession } from '@shared/session'
import type { Batch, Distribution, User } from '@domain/types'

const BATCH_FILTERS = ['ALL', 'DRAFT', 'SIGNED', 'EXPORTED', 'SENT'] as const
type BatchFilter = (typeof BATCH_FILTERS)[number]

const DISTRIBUTION_FILTERS = ['ALL', 'PLANNED', 'IN_PROGRESS', 'COMPLETED'] as const
type DistributionFilter = (typeof DISTRIBUTION_FILTERS)[number]

type PieDatum = { label: string; count: number; color: string }
type VisitItem = {
  appId: string
  applicant: string
  region: string
  status: string
  scheduledAt: string
}
type PresenceSnapshot = Array<{
  id: string
  name: string
  role: string
  region: string
  isOnline: boolean
  lastActive: number | null
}>

export default function OverviewPage() {
  const session = getSession()
  const db = Data.get()
  const [presence, setPresence] = useState<Record<string, number>>({})
  const [batchFilter, setBatchFilter] = useState<BatchFilter>('ALL')
  const [distributionFilter, setDistributionFilter] = useState<DistributionFilter>('ALL')

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('backoffice.presence.v1')
      const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {}
      setPresence(parsed)
    } catch {}
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !session) return
    const update = () => {
      try {
        const raw = localStorage.getItem('backoffice.presence.v1')
        const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {}
        parsed[session.userId] = Date.now()
        localStorage.setItem('backoffice.presence.v1', JSON.stringify(parsed))
        setPresence(parsed)
      } catch {}
    }
    update()
    const id = window.setInterval(update, 60_000)
    return () => window.clearInterval(id)
  }, [session?.userId])

  const accessible = useMemo(() => {
    let apps = db.applications.slice()
    if (!session) return apps
    if (session.role === 'TKSK') {
      apps = apps.filter(app => app.assigned_to === session.userId)
    } else if (session.role === 'RISK') {
      apps = apps.filter(app => app.flags.duplicate_face || app.flags.duplicate_nik || app.flags.device_anomaly)
    }
    return apps
  }, [db, session])

  const total = accessible.length
  const inReview = accessible.filter(a => a.status === 'DESK_REVIEW' || a.status === 'FIELD_VISIT').length
  const approved = accessible.filter(a => a.status === 'FINAL_APPROVED').length
  const rejected = accessible.filter(a => a.status === 'FINAL_REJECTED').length
  const disbReady = accessible.filter(a => a.status === 'DISBURSEMENT_READY').length
  const flagged = accessible.filter(a => a.flags.duplicate_face || a.flags.duplicate_nik || a.flags.device_anomaly).length
  const aging = accessible.filter(a => a.aging_days > 3 && (!a.visits.length || a.visits.some(v => v.status !== 'VERIFIED'))).length
  const surveyCompleted = accessible.filter(a => a.survey?.completed).length
  const surveyPending = Math.max(total - surveyCompleted, 0)
  const surveyCompletionRatio = total === 0 ? 0 : Math.round((surveyCompleted / total) * 100)

  const agingLabel = `3 hari menunggu TKSK (${aging})`

  const funnelData = useMemo(() => {
    const finalStatuses = new Set(['FINAL_APPROVED', 'FINAL_REJECTED', 'DISBURSEMENT_READY', 'DISBURSED', 'DISBURSEMENT_FAILED'])
    return [
      { label: 'Submitted', count: accessible.filter(a => ['SUBMITTED', 'RETURNED_FOR_REVISION'].includes(a.status)).length },
      { label: 'Desk Review', count: accessible.filter(a => a.status === 'DESK_REVIEW').length },
      { label: 'Field Visit', count: accessible.filter(a => a.status === 'FIELD_VISIT').length },
      { label: 'Final', count: accessible.filter(a => finalStatuses.has(a.status)).length },
    ]
  }, [accessible])

  const agingBuckets = useMemo(() => {
    const buckets = [
      { label: '0-2 hari', match: (n: number) => n <= 2, count: 0 },
      { label: '3-5 hari', match: (n: number) => n >= 3 && n <= 5, count: 0 },
      { label: '6-10 hari', match: (n: number) => n >= 6 && n <= 10, count: 0 },
      { label: '> 10 hari', match: (n: number) => n > 10, count: 0 },
    ]
    accessible.forEach(app => {
      const aging = app.aging_days ?? 0
      const bucket = buckets.find(b => b.match(aging))
      if (bucket) bucket.count += 1
    })
    return buckets
  }, [accessible])

  const upcomingVisits = useMemo(() => {
    const now = new Date()
    const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    return accessible
      .flatMap(app =>
        app.visits.map(visit => ({
          appId: app.id,
          applicant: app.applicant.name,
          region: `${app.region.kab} / ${app.region.kec}`,
          status: visit.status,
          scheduledAt: visit.scheduled_at,
        })),
      )
      .filter(item => {
        const when = new Date(item.scheduledAt)
        return !Number.isNaN(when.getTime()) && when >= now && when <= horizon && item.status !== 'VERIFIED'
      })
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .slice(0, 5)
  }, [accessible])

  const presenceSnapshot = useMemo(() => buildPresence(db.users, presence), [db.users, presence])
  const funnelChartData = useMemo(() => {
    const colors = ['#2563eb', '#7c3aed', '#f97316', '#0ea5e9']
    return funnelData.map((stage, idx) => ({
      ...stage,
      color: colors[idx % colors.length],
    }))
  }, [funnelData])
  const agingChartData = useMemo(() => {
    const colors = ['#22c55e', '#eab308', '#f97316', '#ef4444']
    return agingBuckets.map((bucket, idx) => ({
      ...bucket,
      color: colors[idx % colors.length],
    }))
  }, [agingBuckets])
  const batchCounts = useMemo(() => computeStatusCount(db.batches.map(b => b.status), BATCH_FILTERS), [db.batches])
  const distributionCounts = useMemo(
    () => computeStatusCount(db.distributions.map(d => d.status), DISTRIBUTION_FILTERS),
    [db.distributions],
  )
  const filteredBatches = useMemo(() => {
    let items = db.batches.slice()
    if (batchFilter !== 'ALL') items = items.filter(batch => batch.status === batchFilter)
    return items.slice(0, 6)
  }, [batchFilter, db.batches])
  const filteredDistributions = useMemo(() => {
    let items = db.distributions.slice()
    if (distributionFilter !== 'ALL') items = items.filter(dist => dist.status === distributionFilter)
    return items.slice(0, 6)
  }, [distributionFilter, db.distributions])

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Overview</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
        <Card title="Total Submitted" value={total} />
        <Card title="In Review" value={inReview} />
        <Card title="Approved" value={approved} />
        <Card title="Rejected" value={rejected} />
        <Card title="Disbursement Ready" value={disbReady} />
        <Card title="Flagged Cases" value={flagged} tone="warning" helper="Cek ulang sebelum lanjut" />
        <Card title="Survey Selesai" value={surveyCompleted} helper={`${surveyCompletionRatio}% terisi`} tone="success" />
        <Card title="Survey Pending" value={surveyPending} helper={total ? `${surveyPending} dari ${total}` : '—'} />
      </div>
      <section className="bg-white border rounded p-4">
        <h3 className="font-medium mb-3">Shortcuts</h3>
        <div className="flex flex-wrap gap-3 text-sm">
          <button className="px-3 py-2 border rounded" onClick={() => AppRouter.navigate('/applications?flagged=1')}>Flagged ({flagged})</button>
          <button className="px-3 py-2 border rounded" onClick={() => AppRouter.navigate('/applications?status=FIELD_VISIT&status=DESK_REVIEW&aging=3')}>{agingLabel}</button>
        </div>
      </section>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <PieChart
          title="Funnel Proses"
          description="Proporsi kasus di setiap tahap. Gunakan untuk melihat bottleneck dan drop-off."
          data={funnelChartData}
          emptyLabel="Belum ada data proses."
        />
        <PieChart
          title="SLA Aging"
          description="Distribusi durasi tunggu. Kasus dengan aging tinggi perlu segera ditindak."
          data={agingChartData}
          emptyLabel="Belum ada data aging."
        />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-4">
        <UpcomingVisitsCard visits={upcomingVisits} />
        <UserPresenceCard snapshot={presenceSnapshot} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <BatchListCard
          filter={batchFilter}
          onFilterChange={setBatchFilter}
          counts={batchCounts}
          items={filteredBatches}
        />
        <DistributionListCard
          filter={distributionFilter}
          onFilterChange={setDistributionFilter}
          counts={distributionCounts}
          items={filteredDistributions}
        />
      </div>
    </div>
  )
}

function Card({ title, value, helper, tone }: { title: string; value: number; helper?: string; tone?: 'success' | 'warning' }) {
  const containerClass =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50'
      : tone === 'warning'
      ? 'border-amber-200 bg-amber-50'
      : 'border-slate-200 bg-white'
  const valueClass =
    tone === 'success'
      ? 'text-2xl font-semibold text-emerald-700'
      : tone === 'warning'
      ? 'text-2xl font-semibold text-amber-700'
      : 'text-2xl font-semibold text-slate-900'
  const helperClass =
    tone === 'success'
      ? 'text-xs text-emerald-700/80'
      : tone === 'warning'
      ? 'text-xs text-amber-700/80'
      : 'text-xs text-slate-600'
  const titleClass =
    tone === 'success'
      ? 'text-sm text-emerald-700/80'
      : tone === 'warning'
      ? 'text-sm text-amber-700/80'
      : 'text-sm text-slate-500'
  return (
    <div className={`rounded border p-4 ${containerClass}`}>
      <div className={titleClass}>{title}</div>
      <div className={valueClass}>{value}</div>
      {helper && <div className={`${helperClass} mt-1`}>{helper}</div>}
    </div>
  )
}

function PieChart({ title, description, data, emptyLabel }: { title: string; description: string; data: PieDatum[]; emptyLabel: string }) {
  const total = data.reduce((sum, item) => sum + item.count, 0)
  if (total === 0) {
    return (
      <div className="bg-white border rounded p-4 space-y-3">
        <h3 className="font-medium">{title}</h3>
        <p className="text-xs text-slate-500">{description}</p>
        <p className="text-sm text-slate-500">{emptyLabel}</p>
      </div>
    )
  }
  let acc = 0
  const segments: string[] = []
  data.forEach(item => {
    const start = acc
    const share = item.count / total
    acc += share
    const end = acc
    segments.push(`${item.color} ${Math.round(start * 100)}% ${Math.round(end * 100)}%`)
  })
  const gradient = `conic-gradient(${segments.join(', ')})`
  return (
    <div className="bg-white border rounded p-4 space-y-3">
      <h3 className="font-medium">{title}</h3>
      <p className="text-xs text-slate-500">{description}</p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative mx-auto sm:mx-0">
          <div className="w-32 h-32 rounded-full" style={{ background: gradient }} />
          <div className="absolute inset-6 rounded-full bg-white flex items-center justify-center">
            <span className="text-lg font-semibold">{total}</span>
          </div>
        </div>
        <ul className="space-y-2 text-sm flex-1">
          {data.map(item => (
            <li key={item.label} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full" style={{ background: item.color }} />
                {item.label}
              </span>
              <span className="font-medium">{item.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function UpcomingVisitsCard({ visits }: { visits: VisitItem[] }) {
  return (
    <div className="bg-white border rounded p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Agenda Kunjungan 7 Hari</h3>
        <button className="text-xs text-blue-600 underline" onClick={() => AppRouter.navigate('/tksk')}>
          Kelola TKSK
        </button>
      </div>
      <p className="text-xs text-slate-500">Daftar kunjungan lapangan yang akan berlangsung satu minggu ke depan.</p>
      {visits.length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada kunjungan dalam waktu dekat.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {visits.map(item => (
            <li key={`${item.appId}-${item.scheduledAt}`} className="border rounded p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium">{item.applicant}</div>
                <div className="text-xs text-slate-500">{item.appId} · {item.region}</div>
              </div>
              <div className="text-right text-xs text-slate-500">
                <div>{new Date(item.scheduledAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                <span className="inline-block mt-1 px-2 py-0.5 rounded bg-blue-100 text-blue-600">{item.status}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function UserPresenceCard({ snapshot }: { snapshot: PresenceSnapshot }) {
  const online = snapshot.filter(item => item.isOnline)
  const offline = snapshot.filter(item => !item.isOnline)
  return (
    <div className="bg-white border rounded p-4 space-y-3">
      <h3 className="font-medium">Status Pengguna Backoffice</h3>
      <p className="text-xs text-slate-500">Monitoring sederhana pengguna yang aktif dalam 5 menit terakhir.</p>
      <div className="flex items-center gap-4 text-sm">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-xs">
          Online {online.length}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs">
          Offline {offline.length}
        </span>
      </div>
      <ul className="space-y-2 text-sm">
        {snapshot.map(item => (
          <li key={item.id} className="flex items-start justify-between border rounded px-3 py-2 gap-3">
            <div>
              <div className="font-medium">{item.name}</div>
              <div className="text-xs text-slate-500">{item.id} · {item.role} · {item.region}</div>
            </div>
            <div className="text-xs text-right">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${item.isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: item.isOnline ? '#16a34a' : '#94a3b8' }} />
                {item.isOnline ? 'Online' : 'Offline'}
              </span>
              <div className="mt-1 text-slate-500">{item.lastActive ? formatRelativeTime(item.lastActive) : 'Belum pernah masuk'}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function BatchListCard({
  filter,
  onFilterChange,
  counts,
  items,
}: {
  filter: BatchFilter
  onFilterChange: (next: BatchFilter) => void
  counts: Record<BatchFilter, number>
  items: Batch[]
}) {
  return (
    <div className="bg-white border rounded p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Daftar Batch</h3>
        <button className="text-xs text-blue-600 underline" onClick={() => AppRouter.navigate('/batches')}>Kelola batch</button>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {BATCH_FILTERS.map(option => (
          <button
            key={option}
            className={`px-2 py-1 rounded border ${filter === option ? 'bg-slate-900 text-white border-slate-900' : 'bg-white'}`}
            onClick={() => onFilterChange(option)}
          >
            {option} ({counts[option] ?? 0})
          </button>
        ))}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Tidak ada batch untuk filter ini.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map(batch => (
            <li key={batch.id} className="border rounded p-3 space-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{batch.code}</div>
                  <div className="text-xs text-slate-500">ID {batch.id} · {batch.items.length} penerima</div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">{batch.status}</span>
              </div>
              <div className="text-xs text-slate-500">Checksum: {batch.checksum}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function DistributionListCard({
  filter,
  onFilterChange,
  counts,
  items,
}: {
  filter: DistributionFilter
  onFilterChange: (next: DistributionFilter) => void
  counts: Record<DistributionFilter, number>
  items: Distribution[]
}) {
  return (
    <div className="bg-white border rounded p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Penyaluran Bansos</h3>
        <button className="text-xs text-blue-600 underline" onClick={() => AppRouter.navigate('/distribution')}>Kelola penyaluran</button>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {DISTRIBUTION_FILTERS.map(option => (
          <button
            key={option}
            className={`px-2 py-1 rounded border ${filter === option ? 'bg-slate-900 text-white border-slate-900' : 'bg-white'}`}
            onClick={() => onFilterChange(option)}
          >
            {option} ({counts[option] ?? 0})
          </button>
        ))}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Tidak ada penyaluran untuk filter ini.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map(dist => (
            <li key={dist.id} className="border rounded p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{dist.name}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(dist.scheduled_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">{dist.status}</span>
              </div>
              <div className="text-xs text-slate-500">{dist.location}</div>
              <div className="text-xs text-slate-500">
                <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600">{dist.channel}</span>
                <span className="ml-2">{dist.beneficiaries.length} penerima • {dist.notified.length} diberi tahu</span>
              </div>
              {dist.batch_codes.length > 0 && (
                <div className="text-xs text-slate-500">Batch: {dist.batch_codes.join(', ')}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function buildPresence(users: User[], presMap: Record<string, number>): PresenceSnapshot {
  const cutoff = Date.now() - 5 * 60 * 1000
  return users
    .map(user => {
      const lastActive = presMap[user.id] ?? null
      const isOnline = lastActive !== null && lastActive >= cutoff
      return {
        id: user.id,
        name: user.name,
        role: user.role,
        region: user.region_scope.join(', '),
        isOnline,
        lastActive,
      }
    })
    .sort((a, b) => {
      if (a.isOnline === b.isOnline) {
        const aTime = a.lastActive ?? 0
        const bTime = b.lastActive ?? 0
        return bTime - aTime
      }
      return a.isOnline ? -1 : 1
    })
}

function computeStatusCount<T extends string>(values: T[], filters: readonly (T | 'ALL')[]): Record<T | 'ALL', number> {
  const counts = {} as Record<T | 'ALL', number>
  counts.ALL = values.length
  values.forEach(value => {
    counts[value] = (counts[value] ?? 0) + 1
  })
  filters.forEach(filter => {
    if (!(filter in counts)) counts[filter as T] = 0
  })
  return counts
}

function formatRelativeTime(value: number) {
  const diff = Date.now() - value
  if (diff < 30_000) return 'Baru saja'
  const mins = Math.round(diff / 60_000)
  if (mins < 60) return `${mins} menit lalu`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.round(hours / 24)
  return `${days} hari lalu`
}
