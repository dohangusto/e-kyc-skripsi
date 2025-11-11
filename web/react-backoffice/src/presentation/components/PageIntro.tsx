import type { ReactNode } from 'react'

export function PageIntro({ children }: { children: ReactNode }) {
  return (
    <section className="text-sm text-slate-600">
      {children}
    </section>
  )
}
