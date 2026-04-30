import { useEffect, useState } from 'react'
import { CheckCircle2, Info, UserSearch, X, XCircle } from 'lucide-react'
import { useEmployeesScreen } from '../../application/useEmployeesScreen'
import { useMonthControls } from '../../application/useMonthControls'
import { usePaySlipScreen } from '../../application/usePaySlipScreen'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { useStore } from '../../infrastructure/state/store'
import { cn } from '../../utils/cn'
import { ConfirmDialog } from '../app/ConfirmDialog'
import { EmployeeMonthOverview } from '../employees/EmployeeMonthOverview'
import { PaySlipView } from '../payslip/PaySlipView'

type PayrollTab = 'overview' | 'detail'

export function PayrollTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: PayrollTab
  onTabChange: (tab: PayrollTab) => void
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-100 p-0.5">
      <button
        className={cn(
          'rounded px-2.5 py-1 text-xs font-medium transition-colors',
          activeTab === 'overview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900',
        )}
        onClick={() => onTabChange('overview')}
      >
        Přehled roku
      </button>
      <button
        className={cn(
          'rounded px-2.5 py-1 text-xs font-medium transition-colors',
          activeTab === 'detail' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900',
        )}
        onClick={() => onTabChange('detail')}
      >
        Detail měsíce
      </button>
    </div>
  )
}

export function PayrollMainScreen({
  activeTab,
  onActiveTabChange,
}: {
  activeTab: PayrollTab
  onActiveTabChange: (tab: PayrollTab) => void
}) {
  const overview = useEmployeesScreen()
  const monthControls = useMonthControls()
  const paySlip = usePaySlipScreen()
  const selectedEmployeeId = useStore(s => s.selectedEmployeeId)
  const currentMonth = useStore(s => s.currentMonth)
  const setCurrentMonth = useStore(s => s.setCurrentMonth)
  const [toast, setToast] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null)

  useEffect(() => {
    const nextToast =
      overview.error ? { type: 'error' as const, message: overview.error } :
      monthControls.error ? { type: 'error' as const, message: monthControls.error } :
      paySlip.error ? { type: 'error' as const, message: paySlip.error } :
      overview.info ? { type: 'success' as const, message: overview.info } :
      monthControls.success ? { type: 'success' as const, message: monthControls.success } :
      monthControls.info ? { type: 'info' as const, message: monthControls.info } :
      paySlip.info ? { type: 'info' as const, message: paySlip.info } :
      null

    if (!nextToast) return
    setToast(nextToast)
    const timeout = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timeout)
  }, [
    monthControls.error,
    monthControls.info,
    monthControls.success,
    overview.error,
    overview.info,
    paySlip.error,
    paySlip.info,
  ])

  const handleOpenMonth = (month: string) => {
    setCurrentMonth(month)
    onActiveTabChange('detail')
  }

  const handleRunMonthAction = async (month: string) => {
    setCurrentMonth(month)
    await overview.onRunMonthAction(month)
    onActiveTabChange('detail')
  }

  if (!selectedEmployeeId) {
    return (
      <EmptyState
        icon={<UserSearch />}
        title="Vyberte zaměstnance"
        description="Použijte selektor v pravém horním rohu."
      />
    )
  }

  return (
    <div className="space-y-4">
      {toast && (
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
      )}
      <ConfirmDialog
        open={monthControls.showArchiveConfirm}
        title="Zrušit uzávěrku?"
        description="Výpočty a vydané dokumenty budou zneplatněny. Měsíc se vrátí do stavu Rozpracováno."
        onConfirm={monthControls.onConfirmArchive}
        onCancel={monthControls.onCancelArchive}
      />

      <div className={activeTab === 'overview' ? 'block' : 'hidden'}>
        <EmployeeMonthOverview
          mode="payroll"
          currentMonth={currentMonth}
          rows={overview.monthRows}
          onInitMonth={overview.onInitMonth}
          onRunMonthAction={handleRunMonthAction}
          onOpenMonth={handleOpenMonth}
        />
      </div>
      <div className={activeTab === 'detail' ? 'block' : 'hidden'}>
        <PaySlipView
          month={paySlip.month}
          employeeHeader={paySlip.employeeHeader}
          loading={paySlip.loading}
          error={paySlip.error}
          info={paySlip.info}
          blocked={paySlip.blocked}
          blockedMessage={paySlip.blockedMessage}
          isDataClosed={paySlip.isDataClosed}
          printDisabled={paySlip.printDisabled}
          dataClosedWarning={paySlip.dataClosedWarning}
          internalInputs={paySlip.internalInputs}
          currentCalculationRows={paySlip.currentCalculationRows}
          issuedPayslipDocument={paySlip.issuedPayslipDocument}
          issuedDocumentRows={paySlip.issuedDocumentRows}
          issuedDocumentTimeRows={paySlip.issuedDocumentTimeRows}
          employmentTypeLabel={paySlip.employmentTypeLabel}
          onMonthChange={paySlip.onMonthChange}
          onPrintDocument={monthControls.onPrintPayslip}
          extraActions={(
            <>
              <Button variant="secondary" size="sm" onClick={monthControls.onCalculatePayroll} disabled={!monthControls.buttonState.canCalculatePayroll}>
                Spočítat mzdu
              </Button>
              <Button variant="primary" size="sm" onClick={monthControls.onApproveAndIssue} disabled={!monthControls.buttonState.canApproveAndIssue}>Schválit a vystavit</Button>
              <Button variant="ghost" size="sm" onClick={monthControls.onRequestArchive} disabled={!monthControls.buttonState.canRequestArchive}>Zrušit uzávěrku</Button>
            </>
          )}
        />
      </div>
    </div>
  )
}
