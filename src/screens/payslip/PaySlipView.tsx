import type { ReactNode } from 'react'
import type { HolidayCompensationMode, IssuedPayslipDocument } from '../../domain/shared/types'
import { IssuedPayslipDocumentView } from '../documents/IssuedPayslipDocumentView'

type InternalInputProps = {
  manualReward: number
  holidayCompensationMode: HolidayCompensationMode
  showHolidayCompensationMode: boolean
  onManualRewardChange: (value: number) => void
  onHolidayCompensationModeChange: (value: HolidayCompensationMode) => void
}

type PayslipRow = { label: string; hrs?: string; days?: string; czk?: string; bold?: boolean; neg?: boolean }
type CalculationRow = { label: string; value: string; formula: string }

export interface PaySlipViewProps {
  month: string
  employeeHeader: string
  loading: boolean
  error: string
  info: string
  blocked: boolean
  blockedMessage: string
  isDataClosed: boolean
  printDisabled: boolean
  dataClosedWarning: string
  internalInputs: InternalInputProps
  currentCalculationRows: {
    sections: {
      title: string
      rows: CalculationRow[]
    }[]
    grossWage: string
    netWage: string
  } | null
  issuedPayslipDocument: IssuedPayslipDocument | null
  issuedDocumentRows: {
    earningsRows: PayslipRow[]
    contributionRows: PayslipRow[]
    taxRows: PayslipRow[]
    recapRows: PayslipRow[]
    grossWage: string
    netWage: string
  } | null
  issuedDocumentTimeRows: PayslipRow[]
  employmentTypeLabel: string
  extraActions?: ReactNode
  onMonthChange: (month: string) => void
  onPrintDocument: () => void
}

export function PaySlipView({
  employeeHeader,
  loading,
  error,
  info,
  blocked,
  blockedMessage,
  isDataClosed,
  printDisabled,
  dataClosedWarning,
  internalInputs,
  currentCalculationRows,
  issuedPayslipDocument,
  issuedDocumentRows,
  issuedDocumentTimeRows,
  employmentTypeLabel,
  extraActions,
  onPrintDocument,
}: PaySlipViewProps) {
  const inp = 'min-h-8 w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-right text-xs outline-none'

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] text-xs">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-base font-semibold text-slate-900">Mzda / Výplatní páska</span>
        <button
          type="button"
          disabled={printDisabled || !issuedPayslipDocument}
          onClick={onPrintDocument}
          className="border border-blue-600 bg-blue-600 px-3 py-2 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Tisk / PDF
        </button>
        {extraActions}
      </div>

      <div className="mb-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-600">{employeeHeader}</div>

      {blocked && <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 font-medium text-amber-800">{blockedMessage}</div>}
      {loading && <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">Načítání PHV...</div>}
      {!loading && error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 font-medium text-red-700">{error}</div>}
      {!loading && info && <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">{info}</div>}
      {!loading && dataClosedWarning && <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 font-medium text-amber-800">{dataClosedWarning}</div>}

      {!blocked && !loading && (
        <div className="space-y-4">
          <section className="app-controls rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 text-sm font-semibold text-slate-900">Interní mzdové vstupy</div>
            <div className="grid gap-4 md:grid-cols-2">
              <table className="w-full">
                <tbody>
                  <InputRow label="Ruční odměna">
                    <input type="number" className={inp} value={internalInputs.manualReward} onChange={e => internalInputs.onManualRewardChange(parseFloat(e.target.value) || 0)} />
                  </InputRow>
                  {internalInputs.showHolidayCompensationMode && (
                    <InputRow label="Práce ve svátek">
                      <select
                        className="min-h-8 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs outline-none"
                        value={internalInputs.holidayCompensationMode}
                        onChange={event => internalInputs.onHolidayCompensationModeChange(event.target.value as HolidayCompensationMode)}
                      >
                        <option value="time-off">Náhradní volno</option>
                        <option value="premium">Proplatit příplatkem</option>
                      </select>
                    </InputRow>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {currentCalculationRows && (
            <section className="app-controls rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-900">Výpočet mzdy</div>
                <div className="flex flex-wrap gap-2 text-[12px]">
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-900">Hrubá mzda: {currentCalculationRows.grossWage}</span>
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-900">Čistá mzda: {currentCalculationRows.netWage}</span>
                </div>
              </div>
              <div className="grid gap-2 lg:grid-cols-2 2xl:grid-cols-3">
                {currentCalculationRows.sections.map(section => (
                  <section key={section.title} className="rounded-md border border-slate-200 bg-slate-50 p-2">
                    <div className="mb-1 border-b border-slate-300 pb-1 text-[11px] font-bold uppercase tracking-normal text-slate-900">{section.title}</div>
                    <table className="w-full">
                      <tbody>
                        {section.rows.map(row => <CalculationRowView key={`${section.title}-${row.label}`} label={row.label} value={row.value} formula={row.formula} />)}
                      </tbody>
                    </table>
                  </section>
                ))}
              </div>
            </section>
          )}

          {issuedPayslipDocument && issuedDocumentRows && (
            <div className="space-y-4">
              <section className="app-controls rounded-lg border border-slate-200 bg-slate-50 p-4 text-[12px] text-slate-600">
                <div className="font-semibold text-slate-900">Výplatní páska pro zaměstnance</div>
                Auditní dokument se renderuje z issued snapshotu uloženého při vystavení výplatní pásky.
                <div className="mt-2">Typ pracovního poměru: {employmentTypeLabel}</div>
                <div className="mt-1">Fond / odpracováno: {issuedDocumentTimeRows.map(row => `${row.label} ${row.hrs || ''} ${row.days || ''}`.trim()).join(' · ')}</div>
                <div className="mt-1">Hrubá mzda a Čistá mzda jsou součástí vystaveného dokumentu níže.</div>
              </section>
              <div className="document-print-only" aria-hidden="true">
                <IssuedPayslipDocumentView
                  document={issuedPayslipDocument}
                  earningsRows={issuedDocumentRows.earningsRows}
                  contributionRows={issuedDocumentRows.contributionRows}
                  taxRows={issuedDocumentRows.taxRows}
                  recapRows={issuedDocumentRows.recapRows}
                  grossWage={issuedDocumentRows.grossWage}
                  netWage={issuedDocumentRows.netWage}
                />
              </div>
            </div>
          )}

          {!issuedPayslipDocument && isDataClosed && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 font-medium text-amber-800">
              Vystavený dokument zatím neexistuje. Tisk je dostupný až po schválení a vystavení výplatní pásky.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InputRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <tr>
      <td className="text-slate-700">{label}</td>
      <td className="text-right">{children}</td>
    </tr>
  )
}

function CalculationRowView({ label, value, formula }: CalculationRow) {
  return (
    <tr className="border-t border-slate-200 first:border-t-0">
      <td className="py-1 pr-2 align-top">
        <div className="text-[11px] font-medium leading-4 text-slate-800">{label}</div>
        <div className="text-[10px] leading-3 text-slate-500">{formula}</div>
      </td>
      <td className="whitespace-nowrap py-1 text-right align-top text-[11px] font-semibold leading-4 text-slate-900">{value}</td>
    </tr>
  )
}
