import { useMemo, useState } from 'react'
import { Data } from '@application/services/data-service'
import { Toast } from '@presentation/components/Toast'
import { RoleGate } from '@presentation/components/RoleGate'
import { getSession } from '@shared/session'
import type { Application, Distribution } from '@domain/types'

const CHANNEL_OPTIONS: Array<{ value: Distribution['channel']; label: string }> = [
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'POSPAY', label: 'PosPay' },
  { value: 'TUNAI', label: 'Tunai Langsung' },
]

const STATUS_LABEL: Record<Distribution['status'], string> = {
  PLANNED: 'Terjadwal',
  IN_PROGRESS: 'Sedang Berjalan',
  COMPLETED: 'Selesai',
}

const NEXT_STATUS: Record<Distribution['status'], Distribution['status'] | null> = {
  PLANNED: 'IN_PROGRESS',
  IN_PROGRESS: 'COMPLETED',
  COMPLETED: null,
}

const STATUS_CLASS: Record<Distribution['status'], string> = {
  PLANNED: 'bg-slate-100 text-slate-600',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
}

export default function DistributionPage() {
  const [snapshot, setSnapshot] = useState(Data.get())
  const session = getSession()
  const distributions = snapshot.distributions
  const applications = snapshot.applications
  const batches = snapshot.batches

  const applicationsById = useMemo(
    () => new Map(applications.map(app => [app.id, app])),
    [applications],
  )

  const candidates = useMemo(
    () => applications.filter(app => ['FINAL_APPROVED', 'DISBURSEMENT_READY', 'DISBURSED'].includes(app.status)),
    [applications],
  )

  const [form, setForm] = useState({
    name: '',
    scheduledAt: '',
    channel: CHANNEL_OPTIONS[0].value,
    location: '',
    notes: '',
  })
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState<string[]>([])
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([])

  const batchById = useMemo(() => new Map(batches.map(batch => [batch.id, batch])), [batches])
  const selectedBatchBeneficiaries = useMemo(() => {
    const acc = new Set<string>()
    selectedBatchIds.forEach(batchId => {
      const batch = batchById.get(batchId)
      batch?.items.forEach(item => acc.add(item))
    })
    return Array.from(acc)
  }, [batchById, selectedBatchIds])
  const selectedBatchCodes = useMemo(
    () => selectedBatchIds.map(id => batchById.get(id)?.code).filter((code): code is string => !!code),
    [batchById, selectedBatchIds],
  )

  const effectiveBeneficiaries = selectedBatchIds.length ? selectedBatchBeneficiaries : selectedBeneficiaries

  function toggleBeneficiary(id: string) {
    setSelectedBeneficiaries(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id],
    )
  }

  async function createSchedule() {
    try {
      if (!session) throw new Error('Harus login sebagai admin atau risk')
      if (!form.name.trim()) throw new Error('Nama penyaluran wajib diisi')
      if (!form.scheduledAt) throw new Error('Tanggal penyaluran wajib diisi')
      if (effectiveBeneficiaries.length === 0) throw new Error('Pilih minimal satu penerima atau batch')
      const when = new Date(form.scheduledAt)
      if (Number.isNaN(when.getTime())) throw new Error('Tanggal tidak valid')
      await Data.createDistribution(
        {
          name: form.name.trim(),
          scheduled_at: when.toISOString(),
          channel: form.channel,
          location: form.location.trim() || '—',
          batch_codes: selectedBatchCodes,
          beneficiaries: effectiveBeneficiaries,
          notes: form.notes.trim() || undefined,
        },
        session.userId,
      )
      setSnapshot(Data.refresh())
      setForm({
        name: '',
        scheduledAt: '',
        channel: CHANNEL_OPTIONS[0].value,
        location: '',
        notes: '',
      })
      setSelectedBeneficiaries([])
      setSelectedBatchIds([])
      Toast.show('Jadwal penyaluran dibuat')
    } catch (e) {
      Toast.show(`Gagal membuat jadwal: ${(e as Error).message}`, 'error')
    }
  }

  async function advanceStatus(distribution: Distribution, next: Distribution['status']) {
    try {
      if (!session) throw new Error('Harus login sebagai admin atau risk')
      await Data.updateDistributionStatus(distribution.id, next, session.userId)
      setSnapshot(Data.refresh())
      Toast.show(`Status diperbarui ke ${STATUS_LABEL[next]}`)
    } catch (e) {
      Toast.show(`Gagal memperbarui status: ${(e as Error).message}`, 'error')
    }
  }

  async function notify(distribution: Distribution, ids: string[]) {
    try {
      if (!session) throw new Error('Harus login sebagai admin atau risk')
      if (!ids.length) throw new Error('Tidak ada penerima yang dipilih')
      const pending = ids.filter(id => !distribution.notified.includes(id))
      if (!pending.length) throw new Error('Semua penerima sudah diberi tahu')
      await Data.notifyDistribution(distribution.id, pending, session.userId)
      setSnapshot(Data.refresh())
      Toast.show(`Notifikasi dikirim ke ${pending.length} penerima`)
    } catch (e) {
      Toast.show(`Gagal mengirim notifikasi: ${(e as Error).message}`, 'error')
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Penjadwalan Penyaluran Bansos</h2>

      <section className="bg-white border rounded p-4 space-y-3">
        <div>
          <h3 className="font-medium">Jadwalkan Penyaluran Baru</h3>
          <p className="text-sm text-slate-500">
            Pilih batch atau penerima yang sudah siap disalurkan, lalu tentukan jadwal penyaluran.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm space-y-1">
            <span>Nama Penyaluran</span>
            <input
              className="w-full border rounded p-2 text-sm"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Contoh: PKH Sekupang Tahap 4"
            />
          </label>
          <label className="text-sm space-y-1">
            <span>Waktu Penyaluran</span>
            <input
              type="datetime-local"
              className="w-full border rounded p-2 text-sm"
              value={form.scheduledAt}
              onChange={e => setForm(prev => ({ ...prev, scheduledAt: e.target.value }))}
            />
          </label>
          <label className="text-sm space-y-1">
            <span>Saluran Penyaluran</span>
            <select
              className="w-full border rounded p-2 text-sm"
              value={form.channel}
              onChange={e => setForm(prev => ({ ...prev, channel: e.target.value as Distribution['channel'] }))}
            >
              {CHANNEL_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm space-y-1">
            <span>Lokasi / Catatan Lokasi</span>
            <input
              className="w-full border rounded p-2 text-sm"
              value={form.location}
              onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Contoh: Kantor Kecamatan Sekupang"
            />
          </label>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-sm">Batch Siap Disalurkan ({batches.length})</h4>
            {selectedBatchIds.length > 0 && (
              <button
                className="text-xs text-slate-500 underline"
                onClick={() => setSelectedBatchIds([])}
              >
                Hapus pilihan batch
              </button>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {batches.map(batch => (
              <label key={batch.id} className="border rounded p-2 text-xs flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selectedBatchIds.includes(batch.id)}
                  onChange={() => {
                    setSelectedBatchIds(prev =>
                      prev.includes(batch.id)
                        ? prev.filter(id => id !== batch.id)
                        : [...prev, batch.id],
                    )
                  }}
                />
                <span>
                  <span className="font-semibold text-slate-700">{batch.code}</span>
                  <span className="block text-slate-500">{batch.items.length} penerima · Status {batch.status}</span>
                </span>
              </label>
            ))}
            {batches.length === 0 && <p className="text-sm text-slate-500">Belum ada batch simulasi.</p>}
          </div>
          {selectedBatchIds.length > 0 && (
            <div className="text-xs text-slate-600">
              Menyalurkan {selectedBatchBeneficiaries.length} penerima dari batch terpilih.
            </div>
          )}
        </div>

        <label className="text-sm space-y-1">
          <span>Catatan Tambahan</span>
          <textarea
            className="w-full border rounded p-2 text-sm"
            rows={2}
            value={form.notes}
            onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Arahan khusus untuk tim distribusi"
          />
        </label>

        {selectedBatchIds.length === 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-medium text-sm">Penerima Siap Salur ({candidates.length})</h4>
              <button
                className="text-xs text-slate-500 underline"
                onClick={() => setSelectedBeneficiaries(candidates.map(app => app.id))}
              >
                Pilih semua
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {candidates.map(app => (
                <label key={app.id} className="flex items-start gap-2 border rounded p-2 text-xs">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selectedBeneficiaries.includes(app.id)}
                    onChange={() => toggleBeneficiary(app.id)}
                  />
                  <span>
                    <span className="font-semibold text-slate-700">{app.applicant.name}</span>
                    <span className="block text-slate-500">{app.id} · {app.region.kec}</span>
                    <span className="block text-slate-500">Status: {app.status}</span>
                  </span>
                </label>
              ))}
              {candidates.length === 0 && (
                <p className="text-sm text-slate-500">Belum ada penerima yang siap salur.</p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <RoleGate allow={['ADMIN', 'RISK']}>
            <button className="px-4 py-2 border rounded bg-slate-900 text-white text-sm" onClick={createSchedule}>
              Simpan Jadwal
            </button>
          </RoleGate>
        </div>
      </section>

      <section className="bg-white border rounded p-4 space-y-4">
        <h3 className="font-medium">Jadwal Penyaluran Aktif</h3>
        <div className="space-y-3">
          {distributions.map(distribution => {
            const pending = distribution.beneficiaries.filter(id => !distribution.notified.includes(id))
            return (
              <article key={distribution.id} className="border rounded p-3 space-y-3 text-sm">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-base">{distribution.name}</div>
                    <div className="text-xs text-slate-500">
                      {formatDate(distribution.scheduled_at)} · {channelLabel(distribution.channel)} · {distribution.location}
                    </div>
                    <div className="text-xs text-slate-500">
                      Batch terkait: {distribution.batch_codes.length ? distribution.batch_codes.join(', ') : '—'}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_CLASS[distribution.status]}`}>
                    {STATUS_LABEL[distribution.status]}
                  </span>
                </header>

                <div className="grid gap-2 md:grid-cols-3">
                  <div className="bg-slate-100 border border-slate-200 rounded p-2 text-xs">
                    <div className="text-slate-500">Total penerima</div>
                    <div className="text-lg font-semibold text-slate-700">{distribution.beneficiaries.length}</div>
                  </div>
                  <div className="bg-slate-100 border border-slate-200 rounded p-2 text-xs">
                    <div className="text-slate-500">Sudah diberi tahu</div>
                    <div className="text-lg font-semibold text-slate-700">{distribution.notified.length}</div>
                  </div>
                  <div className="bg-slate-100 border border-slate-200 rounded p-2 text-xs">
                    <div className="text-slate-500">Terakhir diperbarui</div>
                    <div className="text-slate-700">{formatDate(distribution.updated_at)}</div>
                  </div>
                </div>

                {distribution.notes && (
                  <p className="text-xs text-slate-600 italic">Catatan: {distribution.notes}</p>
                )}

                <div className="space-y-2">
                  <h4 className="font-medium text-xs uppercase tracking-wide text-slate-500">Daftar penerima</h4>
                  <ul className="space-y-2">
                    {distribution.beneficiaries.map(id => (
                      <BeneficiaryRow
                        key={id}
                        app={applicationsById.get(id) ?? null}
                        id={id}
                        notified={distribution.notified.includes(id)}
                        onNotify={() => notify(distribution, [id])}
                      />
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-2">
                    <RoleGate allow={['ADMIN', 'RISK']}>
                      <button
                        className="px-3 py-1 border rounded text-xs"
                        onClick={() => notify(distribution, pending)}
                        disabled={!pending.length}
                      >
                        Kirim notifikasi ke semua yang belum
                      </button>
                    </RoleGate>
                    {NEXT_STATUS[distribution.status] && (
                      <RoleGate allow={['ADMIN', 'RISK']}>
                        <button
                          className="px-3 py-1 border rounded text-xs bg-emerald-600 text-white"
                          onClick={() => advanceStatus(distribution, NEXT_STATUS[distribution.status] as Distribution['status'])}
                        >
                          Tandai {STATUS_LABEL[NEXT_STATUS[distribution.status] as Distribution['status']]}
                        </button>
                      </RoleGate>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
          {distributions.length === 0 && (
            <p className="text-sm text-slate-500">Belum ada jadwal penyaluran yang tersimpan.</p>
          )}
        </div>
      </section>
    </div>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '–'
  return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

function channelLabel(channel: Distribution['channel']) {
  return CHANNEL_OPTIONS.find(option => option.value === channel)?.label ?? channel
}

function BeneficiaryRow({ app, id, notified, onNotify }: { app: Application | null; id: string; notified: boolean; onNotify: () => void }) {
  return (
    <li className="border rounded p-2 flex flex-wrap items-center justify-between gap-2 text-xs">
      <div>
        <div className="font-semibold text-slate-700">{app?.applicant.name ?? 'Tidak ditemukan'}</div>
        <div className="text-slate-500">
          {id} {app ? `· ${app.region.kec}` : ''} {app ? `· Status ${app.status}` : ''}
        </div>
      </div>
      <RoleGate allow={['ADMIN', 'RISK']}>
        <button
          className="px-3 py-1 border rounded text-xs"
          onClick={onNotify}
          disabled={notified}
        >
          {notified ? 'Sudah diberi tahu' : 'Kirim notifikasi'}
        </button>
      </RoleGate>
    </li>
  )
}
