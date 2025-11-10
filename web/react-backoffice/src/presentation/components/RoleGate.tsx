import { isValidElement, cloneElement, type ReactNode } from 'react'
import { getSession } from '@shared/session'

export function RoleGate({ allow, children }: { allow: Array<'ADMIN'|'TKSK'|'AUDITOR'>; children: ReactNode }) {
  const s = getSession()
  const ok = !!s && allow.includes(s.role)
  if (ok) return <>{children}</>
  if (isValidElement(children)) {
    return cloneElement(children as any, {
      disabled: true,
      'aria-disabled': true,
      title: `perlu peran ${allow.join(' atau ')}`,
      className: `${(children as any).props?.className ?? ''} opacity-50 cursor-not-allowed pointer-events-none`,
    })
  }
  return <span className="opacity-50 cursor-not-allowed" title={`perlu peran ${allow.join(' atau ')}`}>{children}</span>
}
