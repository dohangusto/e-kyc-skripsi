import type { Db } from '@domain/types'
import { generate } from './mock'

const KEY = 'backoffice.db.v1'

export function loadDb(): Db {
  const raw = localStorage.getItem(KEY)
  if (raw) {
    try { return JSON.parse(raw) as Db } catch {}
  }
  const db = generate(30)
  saveDb(db)
  return db
}

export function saveDb(db: Db) {
  localStorage.setItem(KEY, JSON.stringify(db))
}

export function resetDb() {
  localStorage.removeItem(KEY)
}

