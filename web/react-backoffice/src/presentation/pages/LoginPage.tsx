import { FormEvent, useState } from 'react'

import { AppRouter } from '@app/router'
import { Data } from '@application/services/data-service'
import { setSession } from '@shared/session'

export default function LoginPage() {
  const [nik, setNik] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!nik.trim() || !pin.trim()) {
      setError('Silakan isi NIK dan PIN')
      return
    }
    setLoading(true)
    try {
      const user = await Data.loginWithCredential(nik, pin)
      setSession({ userId: user.id, role: user.role, regionScope: user.region_scope })
      AppRouter.navigate('/overview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded border p-6 space-y-4 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Login Operator</h2>
        <p className="text-sm text-slate-500">Gunakan NIK dan PIN yang terdaftar.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">NIK</span>
          <input
            className="border rounded p-2 text-sm"
            inputMode="numeric"
            autoComplete="off"
            value={nik}
            onChange={e => {
              const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 16)
              setNik(value)
            }}
            placeholder="Masukkan NIK"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">PIN</span>
          <input
            className="border rounded p-2 text-sm"
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={e => {
              const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
              setPin(value)
            }}
            placeholder="6 digit PIN"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full bg-slate-800 text-white rounded py-2 text-sm font-semibold disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Memproses…' : 'Masuk'}
        </button>
      </form>
      <p className="text-xs text-slate-500">
        Session disimpan ke <code>localStorage</code>. Hapus session dengan logout dari menu utama.
      </p>
    </div>
  )
}
