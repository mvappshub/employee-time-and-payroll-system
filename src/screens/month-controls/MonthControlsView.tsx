import type { MonthStatus } from '../../domain/shared/types'

export interface MonthControlsViewProps {
  error: string
  info: string
  success: string
  currentStatus: MonthStatus
  currentStatusLabel: string
  selectedEmployeeName: string
  monthLabel: string
  nextStepLabel: string
  lastActionLabel: string
  buttonState: {
    canLoad: boolean
    canSave: boolean
    canPrefill: boolean
    canClose: boolean
    canCalculatePayroll: boolean
    canApprove: boolean
    canIssuePayslip: boolean
    canPrint: boolean
  }
  onLoad: () => void | Promise<void>
  onSave: () => void | Promise<void>
  onPrefill: () => void
  onCloseMonth: () => void | Promise<void>
  onCalculatePayroll: () => void | Promise<void>
  onApproveMonth: () => void | Promise<void>
  onIssuePayslip: () => void | Promise<void>
}

const btn = 'border border-slate-300 px-2 py-1 text-[12px] text-slate-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400'

export function MonthControlsView({
  error,
  info,
  success,
  currentStatusLabel,
  selectedEmployeeName,
  monthLabel,
  nextStepLabel,
  lastActionLabel,
  buttonState,
  onLoad,
  onSave,
  onPrefill,
  onCloseMonth,
  onCalculatePayroll,
  onApproveMonth,
  onIssuePayslip,
}: MonthControlsViewProps) {
  return (
    <div className="mb-8 rounded border border-slate-200 bg-white p-4 text-xs">
      <div className="mb-3 text-[12px] text-slate-600">
        Zaměstnanec: {selectedEmployeeName} | Měsíc: {monthLabel} | Stav: {currentStatusLabel} | Poslední akce: {lastActionLabel} | Další krok: {nextStepLabel}
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={btn} onClick={onLoad} disabled={!buttonState.canLoad} title="Načíst měsíc z perzistentního úložiště">Načíst měsíc</button>
        <button className={btn} onClick={onSave} disabled={!buttonState.canSave} title="Uložit evidenci pracovní doby">Uložit evidenci</button>
        <button className={btn} onClick={onPrefill} disabled={!buttonState.canPrefill} title="Předvyplnit docházku podle směnového plánu">Předvyplnit měsíc</button>
        <button className={btn} onClick={onCloseMonth} disabled={!buttonState.canClose} title="Uzavřít evidenci — dostupné po založení nebo uložení měsíce">Uzavřít evidenci</button>
        <button className={btn} onClick={onCalculatePayroll} disabled={!buttonState.canCalculatePayroll} title="Spočítat mzdu — dostupné až po uzavření evidence">Spočítat mzdu</button>
        <button className={btn} onClick={onApproveMonth} disabled={!buttonState.canApprove} title="Schválit mzdu — dostupné až po výpočtu mzdy">Schválit mzdu</button>
        <button className={btn} onClick={onIssuePayslip} disabled={!buttonState.canIssuePayslip} title="Vystavit výplatní pásku — dostupné až po schválení mzdy">Vystavit výplatní pásku</button>
        <button className={btn} disabled={!buttonState.canPrint} title="Tisk PDF — dostupné až po vystavení výplatní pásky">Tisk PDF</button>
      </div>
      {success && <div className="mt-3 text-green-700">{success}</div>}
      {info && <div className="mt-3 text-slate-500">{info}</div>}
      {error && <div className="mt-3 text-red-700">{error}</div>}
    </div>
  )
}
