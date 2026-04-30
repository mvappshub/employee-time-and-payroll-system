import { Plus, Users } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusBadge } from '../../components/ui/StatusBadge'
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
    <Card>
      <CardHeader
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={onCreateEmployee}>
            Nový zaměstnanec
          </Button>
        }
      >
        <CardTitle>Zaměstnanci</CardTitle>
      </CardHeader>
      {employees.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={<Users />}
            title="Zatím není založen žádný zaměstnanec"
            description="Začněte založením první karty zaměstnance."
            action={<Button variant="primary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={onCreateEmployee}>Založit zaměstnance</Button>}
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-600">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2 text-left font-semibold">Osobní č.</th>
                <th className="px-3 py-2 text-left font-semibold">Jméno</th>
                <th className="px-3 py-2 text-left font-semibold">Nástup</th>
                <th className="px-3 py-2 text-left font-semibold">Stav</th>
                <th className="px-3 py-2 text-left font-semibold">Aktuální měsíc</th>
                <th className="px-3 py-2 text-left font-semibold">Stav měsíce</th>
                <th className="px-3 py-2 text-left font-semibold">Uzavřený</th>
                <th className="px-3 py-2 text-left font-semibold">Schválený</th>
                <th className="px-3 py-2 text-right font-semibold">Akce</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr
                  key={emp.id}
                  className={`border-b border-slate-100 transition-colors ${selectedEmployeeId === emp.id ? 'bg-blue-50/60' : 'hover:bg-slate-50/80'}`}
                >
                  <td className="px-3 py-1.5 font-mono text-slate-500">{emp.employeeNumber || '—'}</td>
                  <td className="px-3 py-1.5 font-medium text-slate-900">{emp.name || '—'}</td>
                  <td className="px-3 py-1.5 tabular text-slate-600">{emp.employmentStartDate || '—'}</td>
                  <td className="px-3 py-1.5">
                    <Badge tone={emp.status === 'active' ? 'success' : 'muted'}>
                      {emp.status === 'active' ? 'Aktivní' : 'Archivováno'}
                    </Badge>
                  </td>
                  <td className="px-3 py-1.5 tabular text-slate-600">{emp.currentMonth}</td>
                  <td className="px-3 py-1.5"><StatusBadge value={emp.currentMonthStatus} /></td>
                  <td className="px-3 py-1.5 tabular text-slate-600">{emp.lastClosedMonth}</td>
                  <td className="px-3 py-1.5 tabular text-slate-600">{emp.lastApprovedMonth}</td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="secondary" size="xs" onClick={() => onSelectEmployee(emp.id)}>Otevřít</Button>
                      <Button variant="ghost" size="xs" onClick={() => onArchiveEmployee(emp.id)}>Archivovat</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
