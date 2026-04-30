import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../utils/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  leftIcon?: ReactNode
  density?: 'compact' | 'cozy'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, leftIcon, density = 'cozy', className, id, ...rest }, ref) => {
    const inputId = id || (label ? `in-${label.replace(/\s+/g, '-')}` : undefined)
    const sizing = density === 'compact' ? 'h-7 text-xs px-2' : 'h-8 text-sm px-2.5'
    return (
      <div className="grid gap-1">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-slate-700">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 [&>svg]:h-3.5 [&>svg]:w-3.5">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-md border bg-white text-slate-900 shadow-xs',
              'placeholder:text-slate-400',
              'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15',
              'disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed',
              sizing,
              leftIcon && 'pl-7',
              error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15' : 'border-slate-300',
              className,
            )}
            {...rest}
          />
        </div>
        {error ? (
          <span className="text-[11px] text-red-600">{error}</span>
        ) : hint ? (
          <span className="text-[11px] text-slate-500">{hint}</span>
        ) : null}
      </div>
    )
  },
)
Input.displayName = 'Input'
