import { useEffect, useState } from 'react'
import type { Doc } from '@domain/types'

function useResizedImage(url: string) {
  const [src, setSrc] = useState<string>('')
  useEffect(() => {
    let active = true
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (!active) return
      if (img.width <= 1200) {
        setSrc(url)
        return
      }
      try {
        const scale = 1200 / img.width
        const canvas = document.createElement('canvas')
        canvas.width = 1200
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('canvas')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const resized = canvas.toDataURL('image/jpeg', 0.9)
        setSrc(resized)
      } catch {
        setSrc(url)
      }
    }
    img.onerror = () => active && setSrc(url)
    img.src = url
    return () => { active = false }
  }, [url])
  return src
}

export function DocumentGallery({ documents }: { documents: Doc[] }) {
  const [preview, setPreview] = useState<Doc | null>(null)

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-3" role="list">
        {documents.map(doc => (
          <button
            key={doc.id}
            role="listitem"
            className="border rounded overflow-hidden text-left focus:outline-none focus:ring"
            onClick={() => setPreview(doc)}
          >
            <div className="aspect-square bg-slate-100 flex items-center justify-center">
              <img src={doc.url} alt={`${doc.type} preview`} loading="lazy" className="max-h-full" />
            </div>
            <div className="p-2 text-xs">
              <div className="font-medium">{doc.type}</div>
              <div className="text-slate-500">SHA {doc.sha256}</div>
            </div>
          </button>
        ))}
      </div>

      {preview && (
        <PreviewModal doc={preview} onClose={() => setPreview(null)} />
      )}
    </div>
  )
}

function PreviewModal({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const src = useResizedImage(doc.url)
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded shadow max-w-[90vw] max-h-[90vh] overflow-auto p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{doc.type}</h3>
            <p className="text-xs text-slate-500">SHA {doc.sha256}</p>
          </div>
          <button className="px-2 py-1 border rounded" onClick={onClose}>Close</button>
        </div>
        {!src ? (
          <div className="w-[400px] h-[400px] bg-slate-100 animate-pulse rounded" aria-busy="true" />
        ) : (
          <img src={src} alt={`${doc.type} full preview`} className="max-w-[1200px] max-h-[80vh] object-contain" />
        )}
      </div>
    </div>
  )
}
