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
}

export interface EmployeeMonthOverviewProps {
  rows: MonthRow[]
  onInitMonth: (month: string) => void
  onOpenMonth: (month: string) => void
}

export function EmployeeMonthOverview({ rows, onInitMonth, onOpenMonth }: EmployeeMonthOverviewProps) {
  return (
    <section className="rounded border border-slate-200 bg-white p-4">
      <div className="mb-3 text-sm font-semibold text-slate-900">Přehled měsíců zaměstnance</div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="py-1 text-left font-normal">Měsíc</th>
              <th className="py-1 text-left font-normal">Fond</th>
              <th className="py-1 text-left font-normal">Odpracováno</th>
              <th className="py-1 text-left font-normal">DPN</th>
              <th className="py-1 text-left font-normal">Dovolená</th>
              <th className="py-1 text-left font-normal">Saldo</th>
              <th className="py-1 text-left font-normal">Stav evidence</th>
              <th className="py-1 text-left font-normal">Stav mzdy</th>
              <th className="py-1 text-left font-normal">Stav pásky</th>
              <th className="py-1 text-left font-normal">Poslední změna</th>
              <th className="py-1 text-left font-normal">Akce</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.month}>
                <td className="py-1">{row.monthLabel}</td>
                <td className="py-1">{row.fundHours.toFixed(1)}</td>
                <td className="py-1">{row.workedHours.toFixed(1)}</td>
                <td className="py-1">{row.sickHours.toFixed(1)}</td>
                <td className="py-1">{row.vacationHours.toFixed(1)}</td>
                <td className="py-1">{row.saldo.toFixed(1)}</td>
                <td className="py-1">{row.timeStatus}</td>
                <td className="py-1">{row.payrollStatus}</td>
                <td className="py-1">{row.payslipStatus}</td>
                <td className="py-1">{row.updatedAt}</td>
                <td className="py-1">
                  <button
                    className="text-slate-700"
                    onClick={() => {
                      if (row.actionRoute === 'init') {
                        onInitMonth(row.month)
                        return
                      }
                      onOpenMonth(row.month)
                    }}
                  >
                    {row.actionLabel}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
