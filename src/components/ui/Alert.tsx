import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '../../utils/cn'

type Tone = 'info' | 'success' | 'warning' | 'danger'

const styles: Record<Tone, { wrap: string; icon: ReactNode }> = {
  info: { wrap: 'border-blue-200 bg-blue-50 text-blue-900', icon: <Info className="h-4 w-4 text-blue-600" /> },
  success: { wrap: 'border-emerald-200 bg-emerald-50 text-emerald-900', icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" /> },
  warning: { wrap: 'border-amber-200 bg-amber-50 text-amber-900', icon: <AlertTriangle className="h-4 w-4 text-amber-600" /> },
  danger: { wrap: 'border-red-200 bg-red-50 text-red-900', icon: <XCircle className="h-4 w-4 text-red-600" /> },
}

export function Alert({ tone = 'info', title, children, action, className }: { tone?: Tone; title?: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  const s = styles[tone]
  return (
    <div className={cn('flex items-start gap-2.5 rounded-md border px-3 py-2 text-xs', s.wrap, className)}>
      <div className="mt-0.5 shrink-0">{s.icon}</div>
      <div className="min-w-0 flex-1">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className={cn(title && 'mt-0.5', 'text-[11px] opacity-90')}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
