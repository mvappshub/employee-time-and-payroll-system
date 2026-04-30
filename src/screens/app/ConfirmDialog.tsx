import { AlertTriangle } from 'lucide-react'
import { Button } from '../../components/ui/Button'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, description, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm" onMouseDown={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-xl animate-fade-in"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
        </div>
        <h2 className="text-center text-sm font-semibold text-slate-900">{title}</h2>
        <p className="mt-1.5 text-center text-xs text-slate-600">{description}</p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>Zrušit</Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>Potvrdit</Button>
        </div>
      </div>
    </div>
  )
}
