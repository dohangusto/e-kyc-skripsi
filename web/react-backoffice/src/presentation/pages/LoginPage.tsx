import { AppRouter } from '@app/router'
import { Data } from '@application/services/data-service'
import { setSession } from '@shared/session'

const users = Data.get().users

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto bg-white rounded border p-4 space-y-3">
      <h2 className="text-lg font-semibold">Login (Dummy)</h2>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Pilih user</span>
        <select className="border rounded p-2" onChange={e => {
          const user = users.find(u => u.id === e.target.value)
          if (!user) return
          setSession({ userId: user.id, role: user.role, regionScope: user.region_scope })
          AppRouter.navigate('/overview')
        }} defaultValue="">
          <option value="" disabled>Pilih…</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name} — {u.role}</option>)}
        </select>
      </label>
      <p className="text-xs text-slate-500">Session disimpan ke localStorage.</p>
    </div>
  )
}

