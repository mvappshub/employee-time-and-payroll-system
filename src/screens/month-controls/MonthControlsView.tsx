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
    canInitMonth: boolean
    canSave: boolean
    canPrefill: boolean
    canClose: boolean
    canCalculatePayroll: boolean
    canApprove: boolean
    canIssuePayslip: boolean
    canPrint: boolean
  }
  onLoad: () => void | Promise<void>
  onInitMonth: () => void | Promise<void>
  onSave: () => void | Promise<void>
  onPrefill: () => void
  onCloseMonth: () => void | Promise<void>
  onCalculatePayroll: () => void | Promise<void>
  onApproveMonth: () => void | Promise<void>
  onIssuePayslip: () => void | Promise<void>
  onPrintPayslip: () => void | Promise<void>
}

const btn = 'min-h-7 border border-black bg-white px-2 py-1 text-[12px] font-bold text-black disabled:border-slate-400 disabled:bg-slate-100 disabled:text-slate-500'

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
  onInitMonth,
  onSave,
  onPrefill,
  onCloseMonth,
  onCalculatePayroll,
  onApproveMonth,
  onIssuePayslip,
  onPrintPayslip,
}: MonthControlsViewProps) {
  const steps = [
    { label: 'Načíst', done: buttonState.canLoad, active: false },
    { label: 'Evidence', done: buttonState.canSave || buttonState.canClose, active: currentStatusLabel === 'Rozpracováno' || currentStatusLabel === 'Evidence uložena' },
    { label: 'Uzavřít', done: buttonState.canCalculatePayroll || currentStatusLabel === 'Evidence uzavřena', active: currentStatusLabel === 'Evidence uzavřena' },
    { label: 'Mzda', done: buttonState.canApprove || currentStatusLabel === 'Mzda spočítána', active: currentStatusLabel === 'Mzda spočítána' },
    { label: 'Schválit', done: buttonState.canIssuePayslip || currentStatusLabel === 'Mzda schválena', active: currentStatusLabel === 'Mzda schválena' },
    { label: 'Páska', done: buttonState.canPrint || currentStatusLabel === 'Výplatní páska vystavena', active: currentStatusLabel === 'Výplatní páska vystavena' },
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
        <button className={btn} onClick={onSave} disabled={!buttonState.canSave} title="Uložit evidenci pracovní doby. Dostupné jen pro existující měsíc ve stavu draft nebo time_saved.">Uložit evidenci</button>
        <button className={btn} onClick={onPrefill} disabled={!buttonState.canPrefill} title="Předvyplnit docházku podle směnového plánu. Dostupné jen pro existující měsíc ve stavu draft nebo time_saved.">Předvyplnit měsíc</button>
        <button className={btn} onClick={onCloseMonth} disabled={!buttonState.canClose} title="Uzavřít evidenci. Dostupné po založení měsíce a validním stavu draft nebo time_saved.">Uzavřít evidenci</button>
        <button className={btn} onClick={onCalculatePayroll} disabled={!buttonState.canCalculatePayroll} title="Spočítat mzdu. Dostupné až po uzavření evidence.">Spočítat mzdu</button>
        <button className={btn} onClick={onApproveMonth} disabled={!buttonState.canApprove} title="Schválit mzdu. Dostupné až po výpočtu mzdy.">Schválit mzdu</button>
        <button className={btn} onClick={onIssuePayslip} disabled={!buttonState.canIssuePayslip} title="Vystavit výplatní pásku. Dostupné až po schválení mzdy.">Vystavit výplatní pásku</button>
        <button className={btn} onClick={onPrintPayslip} disabled={!buttonState.canPrint} title="Tisk / PDF. Dostupné až po vystavení výplatní pásky.">Tisk / PDF</button>
      </div>
      {success && <div className="mt-2 border border-black bg-[#dbeafe] px-2 py-1 font-bold text-black">{success}</div>}
      {info && <div className="mt-2 border border-black bg-[#f3f4f6] px-2 py-1 text-[#4b5563]">{info}</div>}
      {error && <div className="mt-2 border border-black bg-[#fecaca] px-2 py-1 font-bold text-black">{error}</div>}
    </div>
  )
}
