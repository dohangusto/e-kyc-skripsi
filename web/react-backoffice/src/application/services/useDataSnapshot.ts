import { useSyncExternalStore } from 'react'

import { Data } from './data-service'

const subscribe = (callback: () => void) => {
  const handler = () => callback()
  window.addEventListener('backoffice:data:changed', handler)
  return () => window.removeEventListener('backoffice:data:changed', handler)
}

export function useDataSnapshot() {
  return useSyncExternalStore(subscribe, Data.get, Data.get)
}
