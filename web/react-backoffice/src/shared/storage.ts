import type { Db } from '@domain/types'
import { generate } from './mock'

const KEY = 'backoffice.db.v1'

function hydrate(db: Db): Db {
  return {
    ...db,
    audit: db.audit ?? [],
    clusteringRuns: db.clusteringRuns ?? [],
  }
}

export function loadDb(): Db {
  const raw = localStorage.getItem(KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Db
      return hydrate(parsed)
    } catch {}
  }
  const db = hydrate(generate(30))
  saveDb(db)
  return db
}

export function saveDb(db: Db) {
  localStorage.setItem(KEY, JSON.stringify(db))
}

export function resetDb() {
  localStorage.removeItem(KEY)
}
