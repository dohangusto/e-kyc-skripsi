import { useDataSnapshot } from '@application/services/useDataSnapshot'

export default function UsersPage() {
  const users = useDataSnapshot().users
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Users</h2>
      <div className="bg-white border rounded p-3">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr><th className="text-left p-2">ID</th><th className="text-left p-2">Name</th><th className="text-left p-2">Role</th><th className="text-left p-2">Scope</th></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}><td className="p-2">{u.id}</td><td className="p-2">{u.name}</td><td className="p-2">{u.role}</td><td className="p-2">{u.region_scope.join(', ')}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
