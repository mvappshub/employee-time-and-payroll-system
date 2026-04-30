import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useEmployeesScreen } from '../../application/useEmployeesScreen'
import { useStore } from '../../infrastructure/state/store'
import { EmployeeDetail } from './EmployeeDetail'
import { EmployeeList } from './EmployeeList'

type EmployeesTab = 'list' | 'detail'

export function EmployeesTabs({
  activeTab,
  selectedEmployeeId,
  onTabChange,
}: {
  activeTab: EmployeesTab
  selectedEmployeeId: string | null
  onTabChange: (tab: EmployeesTab) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        className={`rounded-md px-3 py-2 text-sm font-medium shadow-none ${activeTab === 'list' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
        onClick={() => onTabChange('list')}
      >
        Seznam zaměstnanců
      </button>
      <button
        className={`rounded-md px-3 py-2 text-sm font-medium shadow-none ${activeTab === 'detail' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} disabled:bg-slate-100 disabled:text-slate-400`}
        disabled={!selectedEmployeeId}
        onClick={() => onTabChange('detail')}
      >
        Detail zaměstnance
      </button>
    </div>
  )
}

export function EmployeesMainScreen({
  activeTab,
  onActiveTabChange,
}: {
  activeTab: EmployeesTab
  onActiveTabChange: (tab: EmployeesTab) => void
}) {
  const screen = useEmployeesScreen()
  const selectedEmployeeId = useStore(s => s.selectedEmployeeId)
  const [toast, setToast] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null)

  useEffect(() => {
    const nextToast =
      screen.error ? { type: 'error' as const, message: screen.error } :
      screen.info ? { type: 'success' as const, message: screen.info } :
      null

    if (!nextToast) return
    setToast(nextToast)
    const timeout = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timeout)
  }, [screen.error, screen.info])

  const openEmployee = (employeeId: string) => {
    screen.onSelectEmployee(employeeId)
    onActiveTabChange('detail')
  }

  const createEmployee = () => {
    screen.onCreateEmployee()
    onActiveTabChange('detail')
  }

  const toastNode: ReactNode = toast && (
    <div className={`fixed right-6 top-6 z-40 rounded-lg border px-4 py-3 text-sm shadow-lg ${
      toast.type === 'error'
        ? 'border-red-200 bg-red-50 text-red-700'
        : toast.type === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-white text-slate-600'
    }`}>
      {toast.message}
    </div>
  )

  return (
    <div className="space-y-4">
      {toastNode}
      <div className={activeTab === 'list' ? 'block' : 'hidden'}>
        <EmployeeList
          employees={screen.employees}
          selectedEmployeeId={selectedEmployeeId}
          onSelectEmployee={openEmployee}
          onCreateEmployee={createEmployee}
          onArchiveEmployee={screen.onArchiveEmployee}
        />
      </div>
      <div className={activeTab === 'detail' ? 'block' : 'hidden'}>
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
          onPrintContract={screen.onPrintContract}
        />
      </div>
    </div>
  )
}
