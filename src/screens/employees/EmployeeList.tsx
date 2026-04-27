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
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-base font-semibold text-slate-900">Zaměstnanci</div>
        <button className="border border-blue-600 bg-blue-600 px-3 py-2 text-[12px] font-semibold text-white" onClick={onCreateEmployee}>Nový zaměstnanec</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="bg-white text-slate-500">
            <tr>
              <th className="border-b-2 border-slate-200 text-left font-semibold">Osobní číslo</th>
              <th className="border-b-2 border-slate-200 text-left font-semibold">Jméno</th>
              <th className="border-b-2 border-slate-200 text-left font-semibold">Pracovní poměr</th>
              <th className="border-b-2 border-slate-200 text-left font-semibold">Datum nástupu</th>
              <th className="border-b-2 border-slate-200 text-left font-semibold">Stav</th>
              <th className="border-b-2 border-slate-200 text-left font-semibold">Aktuální měsíc</th>
              <th className="border-b-2 border-slate-200 text-left font-semibold">Stav aktuálního měsíce</th>
              <th className="border-b-2 border-slate-200 text-left font-semibold">Poslední uzavřený měsíc</th>
              <th className="border-b-2 border-slate-200 text-left font-semibold">Poslední schválená mzda</th>
              <th className="border-b-2 border-slate-200 text-left font-semibold">Akce</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(employee => (
              <tr key={employee.id} className={`${selectedEmployeeId === employee.id ? 'bg-blue-50' : ''} even:bg-slate-50`}>
                <td>{employee.employeeNumber || '—'}</td>
                <td>{employee.name || '—'}</td>
                <td>Pracovní poměr</td>
                <td>{employee.employmentStartDate || '—'}</td>
                <td>{employee.status}</td>
                <td>{employee.currentMonth}</td>
                <td>{employee.currentMonthStatus}</td>
                <td>{employee.lastClosedMonth}</td>
                <td>{employee.lastApprovedMonth}</td>
                <td>
                  <div className="flex gap-2">
                    <button className="border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-700" onClick={() => onSelectEmployee(employee.id)}>Otevřít</button>
                    <button className="border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-700" onClick={() => onArchiveEmployee(employee.id)}>Archivovat</button>
                  </div>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={10} className="p-0">
                  <div className="brutal-empty flex-col gap-3 rounded-lg">
                    <div className="font-semibold text-slate-900">Zatím není založen žádný zaměstnanec.</div>
                    <button className="border border-blue-600 bg-blue-600 px-3 py-2 text-[12px] font-semibold text-white" onClick={onCreateEmployee}>Založit zaměstnance</button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
