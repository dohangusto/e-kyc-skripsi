import { AppRouter } from '@app/router'
import { getSession, setSession, type Session } from '@shared/session'

export function Navbar({ session }: { session: Session | null }) {
  const Item = ({ to, label }: { to: string; label: string }) => (
    <button onClick={() => AppRouter.navigate(to)} className="px-3 py-2 text-sm hover:bg-slate-200 rounded">
      {label}
    </button>
  )

  return (
    <header className="bg-white border-b">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Backoffice</span>
          <Item to="/overview" label="Overview" />
          <Item to="/applications" label="Applications" />
          <Item to="/tksk" label="TKSK" />
          <Item to="/risk" label="Risk" />
          <Item to="/batches" label="Batches" />
          <Item to="/config" label="Config" />
          <Item to="/users" label="Users" />
          <Item to="/audit" label="Audit" />
        </div>
        <div className="flex items-center gap-3 text-sm">
          {session ? (
            <>
              <span className="text-slate-600">{session.userId} · {session.role} · {session.regionScope.join(',')}</span>
              <button className="px-2 py-1 border rounded" onClick={() => { setSession(null); AppRouter.navigate('/login') }}>Logout</button>
            </>
          ) : (
            <button className="px-2 py-1 border rounded" onClick={() => AppRouter.navigate('/login')}>Login</button>
          )}
        </div>
      </div>
    </header>
  )
}

