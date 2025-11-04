export type Role = 'ADMIN' | 'RISK' | 'TKSK' | 'AUDITOR'

export type Session = {
  userId: string
  role: Role
  regionScope: string[]
}

const KEY = 'backoffice.session'

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setSession(s: Session | null) {
  if (!s) localStorage.removeItem(KEY)
  else localStorage.setItem(KEY, JSON.stringify(s))
}

