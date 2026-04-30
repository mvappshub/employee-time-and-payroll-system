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
  rows: MonthRow[]
  onInitMonth: (month: string) => void
  onRunMonthAction?: (month: string) => void
  onOpenMonth?: (month: string) => void
  onOpenTimeSheetDocument?: (month: string) => void
}

function statusBadgeClass(value: string): string {
  if (value === '—' || value === 'Bez dat') return 'bg-slate-100 text-slate-500'
  if (value.includes('vystav') || value.includes('schvál')) return 'bg-emerald-50 text-emerald-700'
  if (value.includes('spočít') || value.includes('uzavř')) return 'bg-blue-50 text-blue-700'
  return 'bg-amber-50 text-amber-700'
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadgeClass(value)}`}>
      {value}
    </span>
  )
}

export function EmployeeMonthOverview({
  mode,
  rows,
  onInitMonth,
  onRunMonthAction,
  onOpenMonth,
  onOpenTimeSheetDocument,
}: EmployeeMonthOverviewProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="mb-3 text-base font-semibold text-slate-900">Přehled měsíců zaměstnance</div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="bg-white text-slate-600">
            <tr>
              <th className="border-b-2 border-slate-200 text-left font-semibold">Měsíc</th>
              <th className="border-b-2 border-slate-200 text-right font-semibold">Fond</th>
              <th className="border-b-2 border-slate-200 text-right font-semibold">Odpracováno</th>
              <th className="border-b-2 border-slate-200 text-right font-semibold">DPN</th>
              <th className="border-b-2 border-slate-200 text-right font-semibold">Dovolená</th>
              <th className="border-b-2 border-slate-200 text-right font-semibold">Saldo</th>
              <th className="border-b-2 border-slate-200 text-left font-semibold">Stav evidence</th>
              {mode === 'payroll' && <th className="border-b-2 border-slate-200 text-left font-semibold">Stav mzdy</th>}
              {mode === 'payroll' && <th className="border-b-2 border-slate-200 text-left font-semibold">Stav pásky</th>}
              <th className="border-b-2 border-slate-200 text-left font-semibold">Poslední změna</th>
              <th className="border-b-2 border-slate-200 text-left font-semibold">Akce</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr
                key={row.month}
                className={`${mode === 'payroll' ? 'cursor-pointer hover:bg-slate-100' : ''} even:bg-slate-50`}
                onClick={mode === 'payroll' && onOpenMonth ? () => onOpenMonth(row.month) : undefined}
              >
                <td>{row.monthLabel}</td>
                <td className="text-right">{row.fundHours.toFixed(1)}</td>
                <td className="text-right">{row.workedHours.toFixed(1)}</td>
                <td className="text-right">{row.sickHours.toFixed(1)}</td>
                <td className="text-right">{row.vacationHours.toFixed(1)}</td>
                <td className="text-right">{row.saldo.toFixed(1)}</td>
                <td><StatusBadge value={row.timeStatus} /></td>
                {mode === 'payroll' && <td><StatusBadge value={row.payrollStatus} /></td>}
                {mode === 'payroll' && <td><StatusBadge value={row.payslipStatus} /></td>}
                <td>{row.updatedAt}</td>
                <td>
                  <div className="flex gap-2">
                    {mode === 'time' && (
                      <>
                        <button
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700"
                          onClick={() => {
                            if (row.actionRoute === 'init') {
                              onInitMonth(row.month)
                              return
                            }
                            onOpenMonth?.(row.month)
                          }}
                        >
                          Otevřít evidenci
                        </button>
                        <button
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                          disabled={!row.canPreviewTimeSheetDocument}
                          onClick={() => onOpenTimeSheetDocument?.(row.month)}
                        >
                          Výpis evidence
                        </button>
                      </>
                    )}
                    {mode === 'payroll' && onRunMonthAction && (
                      <button
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700"
                        onClick={event => {
                          event.stopPropagation()
                          onRunMonthAction(row.month)
                        }}
                      >
                        {row.actionLabel}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
