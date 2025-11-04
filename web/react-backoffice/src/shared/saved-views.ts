const KEY = 'backoffice.savedViews'

export type SavedView = {
  id: string
  name: string
  query: string
  createdAt: string
}

function load(): SavedView[] {
  const raw = localStorage.getItem(KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as Array<SavedView & { params?: Record<string,string> }>
    return parsed.map(view => {
      if (!view.query && view.params) {
        const q = new URLSearchParams()
        Object.entries(view.params).forEach(([k, v]) => q.append(k, v))
        return { id: view.id, name: view.name, createdAt: view.createdAt, query: q.toString() }
      }
      return view
    })
  } catch {
    return []
  }
}

function persist(views: SavedView[]) {
  localStorage.setItem(KEY, JSON.stringify(views))
}

export const SavedViews = {
  all(): SavedView[] { return load() },
  save(name: string, query: string) {
    const views = load()
    const id = `SV-${Date.now().toString(36)}`
    views.push({ id, name, query, createdAt: new Date().toISOString() })
    persist(views)
    return id
  },
  remove(id: string) {
    const next = load().filter(v => v.id !== id)
    persist(next)
  }
}
