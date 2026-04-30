import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../utils/cn'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border border-slate-200 bg-white shadow-xs', className)} {...rest} />
}

export function CardHeader({ className, children, actions }: { className?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3', className)}>
      <div className="min-w-0">{children}</div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  )
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn('text-sm font-semibold text-slate-900', className)}>{children}</h2>
}

export function CardDescription({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('mt-0.5 text-xs text-slate-500', className)}>{children}</p>
}

export function CardContent({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...rest} />
}

export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center justify-end gap-1.5 rounded-b-lg border-t border-slate-100 bg-slate-50/50 px-4 py-2.5', className)} {...rest} />
}
