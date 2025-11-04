import type { AppStatus } from '@domain/types'

const COLORS: Record<AppStatus, string> = {
  DRAFT: 'bg-slate-200 text-slate-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  DESK_REVIEW: 'bg-amber-100 text-amber-700',
  FIELD_VISIT: 'bg-purple-100 text-purple-700',
  FINAL_APPROVED: 'bg-emerald-100 text-emerald-700',
  FINAL_REJECTED: 'bg-rose-100 text-rose-700',
  RETURNED_FOR_REVISION: 'bg-orange-100 text-orange-700',
  DISBURSEMENT_READY: 'bg-teal-100 text-teal-700',
  DISBURSED: 'bg-green-100 text-green-700',
  DISBURSEMENT_FAILED: 'bg-red-100 text-red-700',
}

export function StatusPill({ status }: { status: AppStatus }) {
  return <span className={`px-2 py-1 rounded text-xs font-medium ${COLORS[status]}`}>{status}</span>
}

