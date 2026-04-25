import { useStore } from '../../infrastructure/state/store'
import { useEmployeesScreen } from '../../application/useEmployeesScreen'
import { EmployeeDetail } from './EmployeeDetail'
import { EmployeeList } from './EmployeeList'
import { EmployeeMonthOverview } from './EmployeeMonthOverview'
import { printDocumentById } from '../documents/print'

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
          contractDocument={screen.employmentContractDocument}
          contractMissingFields={screen.contractMissingFields}
          showContractPreview={screen.showContractPreview}
          canPrintContract={screen.canPrintContract}
          onEmployeeChange={screen.onEmployeeChange}
          onSaveEmployee={screen.onSaveEmployee}
          onToggleContractPreview={screen.onToggleContractPreview}
          onRefreshContractDraft={screen.onRefreshContractDraft}
          onPrintContract={async () => {
            await screen.onPrintContract()
            printDocumentById('employment-contract-document')
          }}
        />
        <EmployeeMonthOverview
          rows={screen.monthRows}
          onInitMonth={screen.onInitMonth}
          onOpenMonth={screen.onOpenMonth}
          onOpenTimeSheetDocument={screen.onOpenTimeSheetDocument}
        />
      </div>
    </div>
  )
}
