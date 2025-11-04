import seed from './seed.json'
import type { Application, Batch, Config, Db, User } from '@domain/types'

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

function id(prefix: string, n = 5) {
  const s = Math.floor(Math.random() * 10 ** n).toString().padStart(n, '0')
  return `${prefix}${s}`
}

export function generate(extra = 25): Db {
  const base = seed as unknown as Db
  const regions = [
    { prov: 'Kepri', kab: 'Batam', kec: 'Sekupang', kel: 'Tg Riau' },
    { prov: 'Kepri', kab: 'Batam', kec: 'Nongsa', kel: 'Kabil' },
    { prov: 'Kepri', kab: 'Batam', kec: 'Batam Kota', kel: 'Belian' },
  ]
  const names = ['Siti', 'Budi', 'Andi', 'Aisyah', 'Putri', 'Rizal']

  const apps: Application[] = [...base.applications]
  for (let i = 0; i < extra; i++) {
    const reg = pick(regions)
    const ocr = Math.round(rand(0.7, 0.99) * 100) / 100
    const face = Math.round(rand(0.6, 0.98) * 100) / 100
    const dupFace = Math.random() < 0.2
    const status: Application['status'] = pick([
      'DESK_REVIEW', 'FIELD_VISIT', 'FINAL_APPROVED', 'FINAL_REJECTED', 'RETURNED_FOR_REVISION', 'SUBMITTED'
    ])
    const idv = `APP-2025-${(10000 + i).toString().padStart(5, '0')}`
    apps.push({
      id: idv,
      applicant: {
        name: `${pick(names)} ${pick(['Aminah','Saputra','Nurhaliza','Hartono'])}`,
        nik_mask: '************' + Math.floor(rand(1000, 9999)),
        dob: `198${Math.floor(rand(0,9))}-0${Math.floor(rand(1,9))}-${(10+Math.floor(rand(0,19))).toString()}`,
        phone_mask: '08****' + Math.floor(rand(1000, 9999)),
      },
      region: reg,
      status,
      scores: { ocr, face, liveness: 'OK' },
      flags: {
        duplicate_nik: Math.random() < 0.05,
        duplicate_face: dupFace,
        device_anomaly: Math.random() < 0.05,
        similarity: Math.round(rand(0.6, 0.99) * 100) / 100,
        candidates: dupFace ? [
          { id: id('APP-'), name: pick(names), similarity: Math.round(rand(0.7, 0.95)*100)/100 },
          { id: id('APP-'), name: pick(names), similarity: Math.round(rand(0.7, 0.95)*100)/100 }
        ] : []
      },
      assigned_to: Math.random() < 0.5 ? 'TKSK-1002' : 'UNASSIGNED',
      aging_days: Math.floor(rand(0, 10)),
      created_at: new Date(Date.now() - rand(0, 15)*86400000).toISOString(),
      documents: [
        { id: id('DOC'), type: 'KTP', url: '/mock/ktp1.jpg', sha256: 'sha' },
        { id: id('DOC'), type: 'SELFIE', url: '/mock/selfie1.jpg', sha256: 'sha' }
      ],
      visits: [],
      timeline: [ { at: new Date().toISOString(), by: 'system', action: 'SEEDED' } ]
    })
  }

  const db: Db = {
    applications: apps,
    users: base.users as User[],
    config: base.config as Config,
    batches: base.batches as Batch[],
    audit: [],
  }
  return db
}

