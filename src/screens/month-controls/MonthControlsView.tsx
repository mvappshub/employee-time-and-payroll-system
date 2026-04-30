import type { MonthStatus } from '../../domain/shared/types'
import { canApproveAndIssue, canCloseAndCalculate, canPrintPayslip } from '../../domain/monthWorkflow'

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
    canInitMonth: boolean
    canCloseAndCalculate: boolean
    canApproveAndIssue: boolean
    canRequestArchive: boolean
    canPrint: boolean
  }
  onLoad: () => void | Promise<void>
  onInitMonth: () => void | Promise<void>
  onCloseAndCalculate: () => void | Promise<void>
  onApproveAndIssue: () => void | Promise<void>
  onRequestArchive: () => void
  onPrintPayslip: () => void | Promise<void>
}

const btn = 'min-h-7 border border-black bg-white px-2 py-1 text-[12px] font-bold text-black disabled:border-slate-400 disabled:bg-slate-100 disabled:text-slate-500'

export function MonthControlsView({
  error,
  info,
  success,
  currentStatus,
  currentStatusLabel,
  selectedEmployeeName,
  monthLabel,
  nextStepLabel,
  lastActionLabel,
  buttonState,
  onLoad,
  onInitMonth,
  onCloseAndCalculate,
  onApproveAndIssue,
  onRequestArchive,
  onPrintPayslip,
}: MonthControlsViewProps) {
  const steps = [
    { label: 'Načíst', done: buttonState.canLoad, active: false },
    { label: 'Evidence', done: buttonState.canCloseAndCalculate, active: canCloseAndCalculate(currentStatus) },
    { label: 'Výpočet', done: buttonState.canApproveAndIssue || canApproveAndIssue(currentStatus), active: canApproveAndIssue(currentStatus) },
    { label: 'Páska', done: buttonState.canPrint || canPrintPayslip(currentStatus), active: canPrintPayslip(currentStatus) },
  ]

  return (
    <div className="app-controls brutal-panel mb-2 text-xs">
      <div className="mb-2 grid grid-cols-6 gap-1">
        {steps.map(step => (
          <div
            key={step.label}
            className={`border px-2 py-1 text-center text-[11px] font-extrabold ${step.active ? 'border-black bg-black text-white' : step.done ? 'border-black bg-slate-300 text-black' : 'border border-dashed border-black bg-white text-slate-700'}`}
          >
            {step.label}
          </div>
        ))}
      </div>
      <div className="mb-2 grid gap-1 md:grid-cols-5">
        <div className="border border-black bg-white px-2 py-1"><span className="font-extrabold">Zaměstnanec:</span> {selectedEmployeeName}</div>
        <div className="border border-black bg-white px-2 py-1"><span className="font-extrabold">Měsíc:</span> {monthLabel}</div>
        <div className="border border-black bg-white px-2 py-1"><span className="font-extrabold">Stav:</span> {currentStatusLabel}</div>
        <div className="border border-black bg-white px-2 py-1"><span className="font-extrabold">Poslední akce:</span> {lastActionLabel}</div>
        <div className="border border-black bg-white px-2 py-1"><span className="font-extrabold">Další krok:</span> {nextStepLabel}</div>
      </div>
      <div className="flex flex-wrap gap-1">
        <button className={btn} onClick={onLoad} disabled={!buttonState.canLoad} title="Načíst měsíc z perzistentního úložiště. Vyžaduje vybraného zaměstnance a existující měsíc.">Načíst měsíc</button>
        <button className={btn} onClick={onInitMonth} disabled={!buttonState.canInitMonth} title="Založit měsíc. Dostupné pouze po výběru zaměstnance a pokud měsíc ještě neexistuje.">Založit měsíc</button>
        <button className={btn} onClick={onCloseAndCalculate} disabled={!buttonState.canCloseAndCalculate} title="Uzavřít evidenci a spočítat mzdu. Dostupné pro rozpracovaný nebo uložený měsíc.">Uzavřít evidenci a spočítat mzdu</button>
        <button className={btn} onClick={onApproveAndIssue} disabled={!buttonState.canApproveAndIssue} title="Schválit mzdu a vystavit výplatní pásku. Dostupné až po výpočtu mzdy.">Schválit a vystavit výplatní pásku</button>
        <button className={btn} onClick={onRequestArchive} disabled={!buttonState.canRequestArchive} title="Zrušit uzávěrku a vrátit měsíc k úpravám. Dostupné až po uzavření evidence.">Zrušit uzávěrku</button>
        <button className={btn} onClick={onPrintPayslip} disabled={!buttonState.canPrint} title="Tisk / PDF. Dostupné až po vystavení výplatní pásky.">Tisk / PDF</button>
      </div>
      {success && <div className="mt-2 border border-black bg-[#dbeafe] px-2 py-1 font-bold text-black">{success}</div>}
      {info && <div className="mt-2 border border-black bg-[#f3f4f6] px-2 py-1 text-[#4b5563]">{info}</div>}
      {error && <div className="mt-2 border border-black bg-[#fecaca] px-2 py-1 font-bold text-black">{error}</div>}
    </div>
  )
}
