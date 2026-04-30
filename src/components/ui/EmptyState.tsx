import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-h-[240px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center', className)}>
      {icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 [&>svg]:h-5 [&>svg]:w-5">
          {icon}
        </div>
      )}
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      {description && <div className="mt-1 max-w-sm text-xs text-slate-500">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
