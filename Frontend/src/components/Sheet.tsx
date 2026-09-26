import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * Bottom sheet, portalled to the app frame so it covers the whole screen
 * (not just the scroll area it was opened from) but stays inside the phone frame on desktop.
 */
export default function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return createPortal(
    <div className="absolute inset-0 z-50 flex flex-col justify-end bg-ink/40" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className="max-h-[85%] overflow-y-auto rounded-t-[28px] bg-paper p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-black/5" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.getElementById('app-frame') ?? document.body,
  )
}
