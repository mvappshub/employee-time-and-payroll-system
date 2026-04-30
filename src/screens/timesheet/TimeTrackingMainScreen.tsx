import { useEffect, useState } from 'react'
import { CheckCircle2, Info, UserSearch, X, XCircle } from 'lucide-react'
import { useEmployeesScreen } from '../../application/useEmployeesScreen'
import { useMonthControls } from '../../application/useMonthControls'
import { useTimeSheetScreen } from '../../application/useTimeSheetScreen'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Select } from '../../components/ui/Select'
import { useStore } from '../../infrastructure/state/store'
import { cn } from '../../utils/cn'
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
  const currentMonth = useStore(s => s.currentMonth)
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

      <div className={activeTab === 'overview' ? 'block' : 'hidden'}>
        <EmployeeMonthOverview
          mode="time"
          currentMonth={currentMonth}
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
              <Select
                density="compact"
                aria-label="Preset směn"
                value={timeSheet.selectedPresetId}
                onChange={event => timeSheet.onPresetChange(event.target.value)}
                className="w-44"
              >
                {timeSheet.presetOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
              <Button variant="secondary" size="xs" onClick={timeSheet.onApplySelectedPreset} disabled={!timeSheet.canApplyPreset}>
                Načíst preset
              </Button>
              <Button variant="ghost" size="xs" onClick={timeSheet.onSaveCurrentAsPreset} disabled={!timeSheet.canSavePreset}>
                Uložit preset
              </Button>
              <Button variant="primary" size="xs" onClick={monthControls.onCloseAndCalculate} disabled={!monthControls.buttonState.canCloseAndCalculate}>
                Uzavřít a spočítat
              </Button>
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
