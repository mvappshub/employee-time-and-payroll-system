import { useEffect, useState } from 'react'
import { useEmployeesScreen } from '../../application/useEmployeesScreen'
import { useMonthControls } from '../../application/useMonthControls'
import { usePaySlipScreen } from '../../application/usePaySlipScreen'
import { useStore } from '../../infrastructure/state/store'
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
    <div className="flex flex-wrap gap-2">
      <button
        className={`rounded-md px-3 py-2 text-sm font-medium shadow-none ${activeTab === 'overview' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
        onClick={() => onTabChange('overview')}
      >
        Přehled za celý rok
      </button>
      <button
        className={`rounded-md px-3 py-2 text-sm font-medium shadow-none ${activeTab === 'detail' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
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
    return <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">Prosím, vyberte zaměstnance vpravo nahoře.</div>
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed right-6 top-6 z-40 rounded-lg border px-4 py-3 text-sm shadow-lg ${
          toast.type === 'error'
            ? 'border-red-200 bg-red-50 text-red-700'
            : toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-white text-slate-600'
        }`}>
          {toast.message}
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
              <button className="border border-blue-600 bg-blue-600 px-3 py-2 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={monthControls.onCalculatePayroll} disabled={!monthControls.buttonState.canCalculatePayroll}>
                Spočítat mzdu
              </button>
              <button className="border border-blue-600 bg-blue-600 px-3 py-2 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={monthControls.onApproveAndIssue} disabled={!monthControls.buttonState.canApproveAndIssue}>
                Schválit a vystavit výplatní pásku
              </button>
              <button className="border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400" onClick={monthControls.onRequestArchive} disabled={!monthControls.buttonState.canRequestArchive}>
                Zrušit uzávěrku (Vrátit k úpravám)
              </button>
            </>
          )}
        />
      </div>
    </div>
  )
}
