import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useEmployeesScreen } from '../../application/useEmployeesScreen'
import { useStore } from '../../infrastructure/state/store'
import { cn } from '../../utils/cn'
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
    <div className="inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-100 p-0.5">
      <button
        className={cn(
          'rounded px-2.5 py-1 text-xs font-medium transition-colors',
          activeTab === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900',
        )}
        onClick={() => onTabChange('list')}
      >
        Seznam zaměstnanců
      </button>
      <button
        className={cn(
          'rounded px-2.5 py-1 text-xs font-medium transition-colors disabled:text-slate-400',
          activeTab === 'detail' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900',
        )}
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
    <div
      className={cn(
        'fixed right-4 top-14 z-50 flex min-w-[260px] max-w-md items-start gap-2 rounded-md border px-3 py-2 text-xs shadow-md animate-fade-in',
        toast.type === 'error' && 'border-red-200 bg-red-50 text-red-900',
        toast.type === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-900',
        toast.type === 'info' && 'border-slate-200 bg-white text-slate-700',
      )}
    >
      {toast.type === 'error' ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
        : toast.type === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        : <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />}
      <div className="flex-1">{toast.message}</div>
      <button onClick={() => setToast(null)} className="shrink-0 text-slate-400 hover:text-slate-700">
        <X className="h-3.5 w-3.5" />
      </button>
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
          section37Document={screen.section37Document}
          handoverProtocolDocument={screen.handoverProtocolDocument}
          onboardingStatus={screen.onboardingStatus}
          vacationBalance={screen.vacationBalance}
          contractMissingFields={screen.contractMissingFields}
          showContractPreview={screen.showContractPreview}
          canPrintContract={screen.canPrintContract}
          onEmployeeChange={screen.onEmployeeChange}
          onSaveEmployee={screen.onSaveEmployee}
          onToggleContractPreview={screen.onToggleContractPreview}
          onRefreshContractDraft={screen.onRefreshContractDraft}
          onPrintContract={screen.onPrintContract}
          onPrintSection37={screen.onPrintSection37}
          onPrintHandoverProtocol={screen.onPrintHandoverProtocol}
        />
      </div>
    </div>
  )
}
