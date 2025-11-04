import { useState } from 'react'

export function ConfirmModal({
  title,
  confirmText = 'Confirm',
  min = 10,
  onConfirm,
  onCancel,
}: {
  title: string
  confirmText?: string
  min?: number
  onConfirm: (reason: string) => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState('')
  const valid = reason.trim().length >= min
  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center p-4 z-50">
      <div className="bg-white rounded shadow max-w-md w-full p-4 space-y-3">
        <h3 className="font-semibold">{title}</h3>
        <textarea className="w-full border rounded p-2 h-28" placeholder={`Alasan (min ${min} karakter)`} value={reason} onChange={e => setReason(e.target.value)} />
        <div className="flex justify-end gap-2">
          <button className="px-3 py-1 border rounded" onClick={onCancel}>Batal</button>
          <button disabled={!valid} className={`px-3 py-1 rounded text-white ${valid ? 'bg-blue-600' : 'bg-slate-400 cursor-not-allowed'}`} onClick={() => onConfirm(reason)}>{confirmText}</button>
        </div>
      </div>
    </div>
  )
}

