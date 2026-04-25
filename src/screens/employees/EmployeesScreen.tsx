import { useStore } from '../../infrastructure/state/store'
import { useEmployeesScreen } from '../../application/useEmployeesScreen'
import { EmployeeDetail } from './EmployeeDetail'
import { EmployeeList } from './EmployeeList'
import { EmployeeMonthOverview } from './EmployeeMonthOverview'

export function EmployeesScreen() {
  const screen = useEmployeesScreen()
  const selectedEmployeeId = useStore(s => s.selectedEmployeeId)

  return (
    <div className="grid gap-6">
      <EmployeeList
        employees={screen.employees}
        selectedEmployeeId={selectedEmployeeId}
        onSelectEmployee={screen.onSelectEmployee}
        onCreateEmployee={screen.onCreateEmployee}
        onArchiveEmployee={screen.onArchiveEmployee}
      />
      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <EmployeeDetail
          employee={screen.selectedEmployee}
          error={screen.error}
          info={screen.info}
          onEmployeeChange={screen.onEmployeeChange}
          onSaveEmployee={screen.onSaveEmployee}
        />
        <EmployeeMonthOverview
          rows={screen.monthRows}
          onInitMonth={screen.onInitMonth}
          onOpenMonth={screen.onOpenMonth}
        />
      </div>
    </div>
  )
}
