import { forwardRef, type ReactNode, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../utils/cn'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  leftIcon?: ReactNode
  density?: 'compact' | 'cozy'
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, leftIcon, density = 'cozy', className, id, children, ...rest }, ref) => {
    const selectId = id || (label ? `sel-${label.replace(/\s+/g, '-')}` : undefined)
    const sizing = density === 'compact' ? 'h-7 text-xs pl-2 pr-7' : 'h-8 text-sm pl-2.5 pr-8'
    return (
      <div className="grid gap-1">
        {label && (
          <label htmlFor={selectId} className="text-xs font-medium text-slate-700">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 [&>svg]:h-3.5 [&>svg]:w-3.5">
              {leftIcon}
            </span>
          )}
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'w-full appearance-none rounded-md border border-slate-300 bg-white text-slate-900 shadow-xs',
              'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15',
              'disabled:bg-slate-50 disabled:text-slate-500',
              sizing,
              leftIcon && (density === 'compact' ? 'pl-7' : 'pl-8'),
              className,
            )}
            {...rest}
          >
            {children}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>
      </div>
    )
  },
)
Select.displayName = 'Select'
