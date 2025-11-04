export type Route = {
  path: string
  params: Record<string, string>
  query: URLSearchParams
  key: number
}

function parse(): Route {
  const { pathname, search } = window.location
  const query = new URLSearchParams(search)
  const parts = pathname.split('/').filter(Boolean)

  // match dynamic application detail
  if (parts[0] === 'applications' && parts[1]) {
    return { path: `/applications/${parts[1]}`, params: { id: parts[1] }, query, key: Date.now() }
  }

  const path = `/${parts.join('/')}` || '/'
  return { path, params: {}, query, key: Date.now() }
}

function navigate(path: string, { replace = false }: { replace?: boolean } = {}) {
  if (replace) window.history.replaceState(null, '', path)
  else window.history.pushState(null, '', path)
  const ev = new Event('app:navigate')
  window.dispatchEvent(ev)
}

function listen(cb: (r: Route) => void) {
  const handler = () => cb(parse())
  window.addEventListener('popstate', handler)
  window.addEventListener('app:navigate', handler)
  return () => {
    window.removeEventListener('popstate', handler)
    window.removeEventListener('app:navigate', handler)
  }
}

export const AppRouter = {
  get: parse,
  navigate,
  listen,
}

