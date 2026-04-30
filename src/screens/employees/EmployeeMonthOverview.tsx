import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { cn } from '../../utils/cn'

type MonthRow = {
  month: string
  monthLabel: string
  fundHours: number
  workedHours: number
  sickHours: number
  vacationHours: number
  saldo: number
  timeStatus: string
  payrollStatus: string
  payslipStatus: string
  updatedAt: string
  actionLabel: string
  actionRoute: 'init' | 'timesheet' | 'payroll'
  canPreviewTimeSheetDocument: boolean
}

export interface EmployeeMonthOverviewProps {
  mode: 'time' | 'payroll'
  currentMonth: string
  rows: MonthRow[]
  onInitMonth: (month: string) => void
  onRunMonthAction?: (month: string) => void
  onOpenMonth?: (month: string) => void
  onOpenTimeSheetDocument?: (month: string) => void
}

export function EmployeeMonthOverview({
  mode,
  currentMonth,
  rows,
  onInitMonth,
  onRunMonthAction,
  onOpenMonth,
  onOpenTimeSheetDocument,
}: EmployeeMonthOverviewProps) {
  return (
    <Card>
      <CardHeader><CardTitle>Přehled měsíců</CardTitle></CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-600">
            <tr className="border-b border-slate-200">
              <th className="px-3 py-2 text-left font-semibold">Měsíc</th>
              <th className="px-3 py-2 text-right font-semibold">Fond</th>
              <th className="px-3 py-2 text-right font-semibold">Odpracováno</th>
              <th className="px-3 py-2 text-right font-semibold">DPN</th>
              <th className="px-3 py-2 text-right font-semibold">Dovolená</th>
              <th className="px-3 py-2 text-right font-semibold">Saldo</th>
              <th className="px-3 py-2 text-left font-semibold">Evidence</th>
              {mode === 'payroll' && <th className="px-3 py-2 text-left font-semibold">Mzda</th>}
              {mode === 'payroll' && <th className="px-3 py-2 text-left font-semibold">Páska</th>}
              <th className="px-3 py-2 text-left font-semibold">Poslední změna</th>
              <th className="px-3 py-2 text-right font-semibold">Akce</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const isCurrent = row.month === currentMonth
              const isFuture = row.month > currentMonth
              return (
                <tr
                  key={row.month}
                  className={cn(
                    'border-b border-slate-100 transition-colors',
                    isCurrent && 'bg-blue-50/60',
                    isFuture && 'opacity-60',
                    !isFuture && 'hover:bg-slate-50/80 cursor-pointer',
                  )}
                  onClick={!isFuture && mode === 'payroll' && onOpenMonth ? () => onOpenMonth(row.month) : undefined}
                >
                  <td className="px-3 py-1.5 font-medium text-slate-900">{row.monthLabel}</td>
                  <td className="px-3 py-1.5 text-right tabular">{row.fundHours === 0 ? <span className="text-slate-400">—</span> : row.fundHours.toFixed(1)}</td>
                  <td className="px-3 py-1.5 text-right tabular">{row.workedHours === 0 ? <span className="text-slate-400">—</span> : row.workedHours.toFixed(1)}</td>
                  <td className="px-3 py-1.5 text-right tabular">{row.sickHours === 0 ? <span className="text-slate-400">—</span> : row.sickHours.toFixed(1)}</td>
                  <td className="px-3 py-1.5 text-right tabular">{row.vacationHours === 0 ? <span className="text-slate-400">—</span> : row.vacationHours.toFixed(1)}</td>
                  <td className={cn('px-3 py-1.5 text-right tabular font-medium', row.saldo > 0 && 'text-emerald-600', row.saldo < 0 && 'text-red-600')}>
                    {row.saldo === 0 ? <span className="text-slate-400">—</span> : `${row.saldo > 0 ? '+' : ''}${row.saldo.toFixed(1)}`}
                  </td>
                  <td className="px-3 py-1.5"><StatusBadge value={row.timeStatus} /></td>
                  {mode === 'payroll' && <td className="px-3 py-1.5"><StatusBadge value={row.payrollStatus} /></td>}
                  {mode === 'payroll' && <td className="px-3 py-1.5"><StatusBadge value={row.payslipStatus} /></td>}
                  <td className="px-3 py-1.5 tabular text-slate-500">{row.updatedAt && row.updatedAt !== '—' ? new Date(row.updatedAt).toLocaleDateString('cs-CZ') : '—'}</td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center justify-end gap-1">
                      {mode === 'time' && (
                        <>
                          <Button variant="secondary" size="xs" onClick={e => { e.stopPropagation(); row.actionRoute === 'init' ? onInitMonth(row.month) : onOpenMonth?.(row.month); }}>
                            Otevřít
                          </Button>
                          <Button variant="ghost" size="xs" disabled={!row.canPreviewTimeSheetDocument} onClick={e => { e.stopPropagation(); onOpenTimeSheetDocument?.(row.month); }}>
                            Výpis
                          </Button>
                        </>
                      )}
                      {mode === 'payroll' && onRunMonthAction && (
                        <Button variant={row.actionRoute === 'payroll' ? 'primary' : 'secondary'} size="xs" onClick={e => { e.stopPropagation(); onRunMonthAction(row.month); }}>
                          {row.actionLabel}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
