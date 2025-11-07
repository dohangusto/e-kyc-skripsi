import { generate } from './mock'
import type { Db, PortalInfo, VerificationStatus } from './schema'

export const SHARED_DB_KEY = 'ekyc.shared.db.v1'
const LEGACY_DB_KEY = 'backoffice.db.v1'
const PORTAL_STATE_KEY = 'ekyc.shared.portal.v1'

type SafeStorage = Storage | null

type StorageSyncMessage =
  | { type: 'storage-bridge:push'; key: string; value: string | null }
  | { type: 'storage-bridge:pull'; key: string }

type BridgeState = {
  frame: HTMLIFrameElement
  ready: boolean
  queue: StorageSyncMessage[]
}

const peerBridges = new Map<string, BridgeState>()
let bridgeInitialised = false

const getStorage = (): SafeStorage => {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

const postToBridge = (origin: string, message: StorageSyncMessage) => {
  const state = peerBridges.get(origin)
  if (!state) return
  if (!state.ready || !state.frame.contentWindow) {
    state.queue.push(message)
    return
  }
  state.frame.contentWindow.postMessage(message, origin)
}

const flushBridgeQueue = (origin: string) => {
  const state = peerBridges.get(origin)
  if (!state || !state.ready || !state.frame.contentWindow) return
  while (state.queue.length) {
    const message = state.queue.shift()
    if (message) {
      state.frame.contentWindow.postMessage(message, origin)
    }
  }
}

const detectPeerOrigins = (): string[] => {
  if (typeof window === 'undefined') return []
  const currentOrigin = window.location.origin
  const host = window.location.hostname
  const protocol = window.location.protocol
  const defaultPorts = ['3000', '3001']
  const currentPort = window.location.port || (protocol === 'https:' ? '443' : '80')

  const baseHosts = new Set<string>([host])
  if (host !== 'localhost') baseHosts.add('localhost')
  if (host !== '127.0.0.1') baseHosts.add('127.0.0.1')

  const origins = new Set<string>()
  baseHosts.forEach(baseHost => {
    defaultPorts.forEach(port => {
      if (port !== currentPort || baseHost !== host) {
        origins.add(`${protocol}//${baseHost}:${port}`)
      }
    })
  })

  const globalPeers = (window as unknown as { __EKYC_SHARED_PEERS__?: string[] }).__EKYC_SHARED_PEERS__
  if (Array.isArray(globalPeers)) {
    globalPeers.forEach(origin => {
      if (typeof origin === 'string' && origin && origin !== currentOrigin) {
        origins.add(origin)
      }
    })
  }

  origins.delete(currentOrigin)
  return Array.from(origins)
}

const ensureBridgeFrames = () => {
  if (bridgeInitialised || typeof window === 'undefined') return
  bridgeInitialised = true

  const peers = detectPeerOrigins()
  if (!peers.length) return

  const createFrame = () => {
    peers.forEach(origin => {
      if (peerBridges.has(origin)) return
      const frame = document.createElement('iframe')
      frame.src = `${origin}/storage-bridge.html?origin=${encodeURIComponent(window.location.origin)}`
      frame.style.display = 'none'
      frame.setAttribute('aria-hidden', 'true')
      frame.tabIndex = -1
      document.body.appendChild(frame)
      peerBridges.set(origin, { frame, ready: false, queue: [] })
      frame.addEventListener('load', () => {
        const state = peerBridges.get(origin)
        if (state && !state.ready) {
          // Wait for ready signal from bridge page
          state.queue.unshift(
            { type: 'storage-bridge:push', key: SHARED_DB_KEY, value: getStorage()?.getItem(SHARED_DB_KEY) ?? null },
            { type: 'storage-bridge:push', key: PORTAL_STATE_KEY, value: getStorage()?.getItem(PORTAL_STATE_KEY) ?? null },
          )
        }
      })
      frame.addEventListener('error', () => {
        peerBridges.delete(origin)
        frame.parentElement?.removeChild(frame)
      })
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createFrame, { once: true })
  } else {
    createFrame()
  }

  window.addEventListener('message', event => {
    if (typeof event.data !== 'object' || event.data === null) return
    const state = peerBridges.get(event.origin)
    if (!state) return

    if (event.data.type === 'storage-bridge:ready') {
      state.ready = true
      flushBridgeQueue(event.origin)
      const storage = getStorage()
      if (storage) {
        postToBridge(event.origin, { type: 'storage-bridge:push', key: SHARED_DB_KEY, value: storage.getItem(SHARED_DB_KEY) })
        postToBridge(event.origin, { type: 'storage-bridge:push', key: PORTAL_STATE_KEY, value: storage.getItem(PORTAL_STATE_KEY) })
        postToBridge(event.origin, { type: 'storage-bridge:pull', key: SHARED_DB_KEY })
        postToBridge(event.origin, { type: 'storage-bridge:pull', key: PORTAL_STATE_KEY })
      }
    } else if (event.data.type === 'storage-bridge:pull-response') {
      const key = typeof event.data.key === 'string' ? event.data.key : null
      if (!key) return
      const storage = getStorage()
      if (!storage) return
      if (typeof event.data.value === 'string') {
        storage.setItem(key, event.data.value)
      } else {
        storage.removeItem(key)
      }
      try {
        const storageEvent = new StorageEvent('storage', {
          key,
          newValue: typeof event.data.value === 'string' ? event.data.value : null,
          oldValue: null,
          storageArea: storage,
          url: window.location.href,
        })
        window.dispatchEvent(storageEvent)
      } catch {
        // ignore environments without StorageEvent constructor
      }
    }
  })
}

const broadcastStorageUpdate = (key: string, value: string | null) => {
  if (!peerBridges.size) return
  const message: StorageSyncMessage = { type: 'storage-bridge:push', key, value }
  peerBridges.forEach((_state, origin) => postToBridge(origin, message))
}

const hydrate = (db: Db): Db => ({
  ...db,
  audit: db.audit ?? [],
  clusteringRuns: db.clusteringRuns ?? [],
  distributions: db.distributions ?? [],
})

const readDbFromStorage = (): Db | null => {
  const storage = getStorage()
  if (!storage) return null
  const raw = storage.getItem(SHARED_DB_KEY) ?? storage.getItem(LEGACY_DB_KEY)
  if (!raw) return null
  try {
    return hydrate(JSON.parse(raw) as Db)
  } catch {
    storage.removeItem(SHARED_DB_KEY)
    return null
  }
}

export const loadDb = (): Db => {
  ensureBridgeFrames()
  const existing = readDbFromStorage()
  if (existing) {
    if (!getStorage()?.getItem(SHARED_DB_KEY)) {
      saveDb(existing)
      getStorage()?.removeItem(LEGACY_DB_KEY)
    }
    return hydrate(existing)
  }
  const generated = hydrate(generate())
  saveDb(generated)
  return generated
}

export const saveDb = (db: Db): void => {
  const storage = getStorage()
  if (!storage) return
  try {
    const payload = JSON.stringify(hydrate(db))
    storage.setItem(SHARED_DB_KEY, payload)
    broadcastStorageUpdate(SHARED_DB_KEY, payload)
  } catch {
    // ignore quota errors in demo mode
  }
}

export const resetDb = (): void => {
  const storage = getStorage()
  if (!storage) return
  storage.removeItem(SHARED_DB_KEY)
  storage.removeItem(LEGACY_DB_KEY)
  storage.removeItem(PORTAL_STATE_KEY)
  broadcastStorageUpdate(SHARED_DB_KEY, null)
  broadcastStorageUpdate(PORTAL_STATE_KEY, null)
}

export type PortalAccountState = PortalInfo & {
  verificationStatus?: VerificationStatus
}

export type PortalState = Record<string, PortalAccountState>

export const loadPortalState = (): PortalState => {
  ensureBridgeFrames()
  const storage = getStorage()
  if (!storage) return {}
  const raw = storage.getItem(PORTAL_STATE_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as PortalState
    return typeof parsed === 'object' && parsed ? parsed : {}
  } catch {
    storage.removeItem(PORTAL_STATE_KEY)
    return {}
  }
}

export const savePortalState = (state: PortalState): void => {
  const storage = getStorage()
  if (!storage) return
  try {
    const payload = JSON.stringify(state)
    storage.setItem(PORTAL_STATE_KEY, payload)
    broadcastStorageUpdate(PORTAL_STATE_KEY, payload)
  } catch {
    // ignore quota issues
  }
}

export const updatePortalState = (applicationId: string, updater: (current: PortalAccountState | undefined) => PortalAccountState | null | undefined): void => {
  const state = loadPortalState()
  const next = updater(state[applicationId])
  if (!next) {
    delete state[applicationId]
  } else {
    state[applicationId] = next
  }
  savePortalState(state)
}
