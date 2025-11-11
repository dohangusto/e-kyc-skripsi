import { useDataSnapshot } from '@application/services/useDataSnapshot'
import { PageIntro } from '@presentation/components/PageIntro'

export default function UsersPage() {
  const users = useDataSnapshot().users
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Users</h2>
      <PageIntro>Referensi operator internal dan penerima dengan cakupan wilayah serta kontaknya.</PageIntro>
      <div className="bg-white border rounded p-3">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Role</th>
              <th className="text-left p-2">Scope</th>
              <th className="text-left p-2">Phone</th>
              <th className="text-left p-2">Email</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td className="p-2">{u.name}</td>
                <td className="p-2">{u.role}</td>
                <td className="p-2">{u.region_scope.join(', ')}</td>
                <td className="p-2">{u.phone ?? '-'}</td>
                <td className="p-2">{u.email ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
