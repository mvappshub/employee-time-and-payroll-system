import { useEffect, useState } from 'react'
import { useEmployeesScreen } from '../../application/useEmployeesScreen'
import { useMonthControls } from '../../application/useMonthControls'
import { useTimeSheetScreen } from '../../application/useTimeSheetScreen'
import { useStore } from '../../infrastructure/state/store'
import { EmployeeMonthOverview } from '../employees/EmployeeMonthOverview'
import { TimeSheetView } from './TimeSheetView'

type TimeTrackingTab = 'overview' | 'detail'

export function TimeTrackingTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: TimeTrackingTab
  onTabChange: (tab: TimeTrackingTab) => void
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

export function TimeTrackingMainScreen({
  activeTab,
  onActiveTabChange,
}: {
  activeTab: TimeTrackingTab
  onActiveTabChange: (tab: TimeTrackingTab) => void
}) {
  const overview = useEmployeesScreen()
  const monthControls = useMonthControls()
  const timeSheet = useTimeSheetScreen()
  const selectedEmployeeId = useStore(s => s.selectedEmployeeId)
  const setCurrentMonth = useStore(s => s.setCurrentMonth)
  const [toast, setToast] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null)

  useEffect(() => {
    const nextToast =
      overview.error ? { type: 'error' as const, message: overview.error } :
      monthControls.error ? { type: 'error' as const, message: monthControls.error } :
      timeSheet.error ? { type: 'error' as const, message: timeSheet.error } :
      overview.info ? { type: 'success' as const, message: overview.info } :
      monthControls.success ? { type: 'success' as const, message: monthControls.success } :
      monthControls.info ? { type: 'info' as const, message: monthControls.info } :
      timeSheet.info ? { type: 'info' as const, message: timeSheet.info } :
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
    timeSheet.error,
    timeSheet.info,
  ])

  const handleOpenMonth = (month: string) => {
    setCurrentMonth(month)
    onActiveTabChange('detail')
  }

  const handleInitMonth = async (month: string) => {
    await overview.onInitMonth(month)
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

      <div className={activeTab === 'overview' ? 'block' : 'hidden'}>
        <EmployeeMonthOverview
          mode="time"
          rows={overview.monthRows}
          onInitMonth={handleInitMonth}
          onOpenMonth={handleOpenMonth}
          onOpenTimeSheetDocument={handleOpenMonth}
        />
      </div>
      <div className={activeTab === 'detail' ? 'block' : 'hidden'}>
        <TimeSheetView
          title={timeSheet.title}
          month={timeSheet.month}
          emptyState={timeSheet.emptyState}
          info={timeSheet.info}
          error={timeSheet.error}
          showDocumentPreview={timeSheet.showDocumentPreview}
          timeSheetDocument={timeSheet.timeSheetDocument}
          canPreviewDocument={timeSheet.canPreviewDocument}
          documentBlockedReason={timeSheet.documentBlockedReason}
          shiftOptions={timeSheet.shiftOptions}
          summary={timeSheet.summary}
          rows={timeSheet.rows}
          onMonthChange={timeSheet.onMonthChange}
          onResetMonth={timeSheet.onResetMonth}
          onToggleDocumentPreview={timeSheet.onToggleDocumentPreview}
          onPrintDocument={timeSheet.onPrintDocument}
          extraActions={(
            <>
              <button className="border border-blue-600 bg-blue-600 px-3 py-2 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={monthControls.onCloseAndCalculate} disabled={!monthControls.buttonState.canCloseAndCalculate}>
                Uzavřít evidenci a spočítat mzdu
              </button>
            </>
          )}
          onShiftChange={timeSheet.onShiftChange}
          onArrivalChange={timeSheet.onArrivalChange}
          onDepartureChange={timeSheet.onDepartureChange}
        />
      </div>
    </div>
  )
}
