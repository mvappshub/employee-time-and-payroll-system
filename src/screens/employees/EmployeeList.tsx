import type { EmployeeSettings } from '../../domain/shared/types'

type EmployeeRow = EmployeeSettings & {
  currentMonth: string
  currentMonthStatus: string
  lastClosedMonth: string
  lastApprovedMonth: string
}

export interface EmployeeListProps {
  employees: EmployeeRow[]
  selectedEmployeeId: string | null
  onSelectEmployee: (id: string) => void
  onCreateEmployee: () => void
  onArchiveEmployee: (id: string) => void
}

export function EmployeeList({ employees, selectedEmployeeId, onSelectEmployee, onCreateEmployee, onArchiveEmployee }: EmployeeListProps) {
  return (
    <section className="rounded border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">Zaměstnanci</div>
        <button className="border border-slate-300 px-2 py-1 text-[11px] text-slate-700" onClick={onCreateEmployee}>Nový zaměstnanec</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="py-1 text-left font-normal">Osobní číslo</th>
              <th className="py-1 text-left font-normal">Jméno</th>
              <th className="py-1 text-left font-normal">Pracovní poměr</th>
              <th className="py-1 text-left font-normal">Datum nástupu</th>
              <th className="py-1 text-left font-normal">Stav</th>
              <th className="py-1 text-left font-normal">Aktuální měsíc</th>
              <th className="py-1 text-left font-normal">Stav aktuálního měsíce</th>
              <th className="py-1 text-left font-normal">Poslední uzavřený měsíc</th>
              <th className="py-1 text-left font-normal">Poslední schválená mzda</th>
              <th className="py-1 text-left font-normal">Akce</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(employee => (
              <tr key={employee.id} className={selectedEmployeeId === employee.id ? 'bg-slate-50' : ''}>
                <td className="py-1">{employee.employeeNumber || '—'}</td>
                <td className="py-1">{employee.name || '—'}</td>
                <td className="py-1">Pracovní poměr</td>
                <td className="py-1">{employee.employmentStartDate || '—'}</td>
                <td className="py-1">{employee.status}</td>
                <td className="py-1">{employee.currentMonth}</td>
                <td className="py-1">{employee.currentMonthStatus}</td>
                <td className="py-1">{employee.lastClosedMonth}</td>
                <td className="py-1">{employee.lastApprovedMonth}</td>
                <td className="py-1">
                  <div className="flex gap-2">
                    <button className="text-slate-700" onClick={() => onSelectEmployee(employee.id)}>Vybrat</button>
                    <button className="text-slate-500" onClick={() => onArchiveEmployee(employee.id)}>Archivovat</button>
                  </div>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={10} className="py-3 text-slate-500">Zatím není založen žádný zaměstnanec.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
