import { Data } from '@application/services/data-service'
import { AppRouter } from '@app/router'

export default function OverviewPage() {
  const db = Data.get()
  const total = db.applications.length
  const inReview = db.applications.filter(a => a.status === 'DESK_REVIEW' || a.status === 'FIELD_VISIT').length
  const approved = db.applications.filter(a => a.status === 'FINAL_APPROVED').length
  const rejected = db.applications.filter(a => a.status === 'FINAL_REJECTED').length
  const disbReady = db.applications.filter(a => a.status === 'DISBURSEMENT_READY').length
  const flagged = db.applications.filter(a => a.flags.duplicate_face || a.flags.duplicate_nik || a.flags.device_anomaly).length
  const aging = db.applications.filter(a => a.aging_days > 3 && (!a.visits.length || a.visits.some(v => v.status !== 'VERIFIED'))).length

  const esc_string_FIELD_VISIT = `3 hari menunggu TKSK (${aging})`

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card title="Total Submitted" value={total} />
        <Card title="In Review" value={inReview} />
        <Card title="Approved" value={approved} />
        <Card title="Rejected" value={rejected} />
        <Card title="Disbursement Ready" value={disbReady} />
      </div>
      <section className="bg-white border rounded p-4">
        <h3 className="font-medium mb-3">Shortcuts</h3>
        <div className="flex flex-wrap gap-3 text-sm">
          <button className="px-3 py-2 border rounded" onClick={() => AppRouter.navigate('/applications?flagged=1')}>Flagged ({flagged})</button>
          <button className="px-3 py-2 border rounded" onClick={() => AppRouter.navigate('/applications?status=FIELD_VISIT&status=DESK_REVIEW&aging=3')}>{esc_string_FIELD_VISIT}</button>
        </div>
      </section>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border rounded p-4 h-64">Funnel (dummy)</div>
        <div className="bg-white border rounded p-4 h-64">SLA Aging (dummy)</div>
      </div>
    </div>
  )
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white rounded border p-4">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  )
}
