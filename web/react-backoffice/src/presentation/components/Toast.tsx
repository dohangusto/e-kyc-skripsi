import { useEffect, useState } from 'react'

type ToastItem = { id: number; text: string; type?: 'success' | 'error' }
const listeners: Array<(items: ToastItem[]) => void> = []
let items: ToastItem[] = []

export const Toast = {
  show(text: string, type: 'success' | 'error' = 'success') {
    const t: ToastItem = { id: Date.now() + Math.random(), text, type }
    items = [t, ...items].slice(0, 5)
    listeners.forEach(l => l(items))
    setTimeout(() => {
      items = items.filter(i => i.id !== t.id)
      listeners.forEach(l => l(items))
    }, 2500)
  },
}

export function ToastHost() {
  const [state, setState] = useState<ToastItem[]>(items)
  useEffect(() => { listeners.push(setState); return () => { const i = listeners.indexOf(setState); if (i>=0) listeners.splice(i,1) } }, [])
  return (
    <div className="fixed bottom-4 right-4 space-y-2">
      {state.map(t => (
        <div key={t.id} className={`px-3 py-2 rounded shadow text-sm text-white ${t.type==='error'?'bg-rose-600':'bg-emerald-600'}`}>{t.text}</div>
      ))}
    </div>
  )
}

