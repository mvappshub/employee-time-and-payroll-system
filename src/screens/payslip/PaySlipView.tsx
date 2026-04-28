import type { ReactNode } from 'react'
import type { IssuedPayslipDocument } from '../../domain/shared/types'
import { IssuedPayslipDocumentView } from '../documents/IssuedPayslipDocumentView'

type InternalInputProps = {
  manualReward: number
  includeManualRewardInAverage: boolean
  unworked: number
  sickCarryoverDays: number
  onManualRewardChange: (value: number) => void
  onIncludeManualRewardInAverageChange: (value: boolean) => void
  onUnworkedChange: (value: number) => void
  onSickCarryoverDaysChange: (value: number) => void
}

type AuditRow = { label: string; value: string }
type PayslipRow = { label: string; hrs?: string; days?: string; czk?: string; bold?: boolean; neg?: boolean }

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
  auditRows: AuditRow[]
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
  onMonthChange: (month: string) => void
  onPrintDocument: () => void
}

export function PaySlipView({
  month,
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
  auditRows,
  issuedPayslipDocument,
  issuedDocumentRows,
  issuedDocumentTimeRows,
  employmentTypeLabel,
  onMonthChange,
  onPrintDocument,
}: PaySlipViewProps) {
  const inp = 'min-h-8 w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-right text-xs outline-none'

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] text-xs">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-base font-semibold text-slate-900">Mzda / Výplatní páska</span>
        <input type="month" value={month} onChange={e => onMonthChange(e.target.value)} className="min-h-8 rounded-md border border-slate-300 bg-white px-3 py-2 text-right text-xs outline-none" />
        <button
          type="button"
          disabled={printDisabled || !issuedPayslipDocument}
          onClick={onPrintDocument}
          className="border border-blue-600 bg-blue-600 px-3 py-2 text-[12px] font-semibold text-white disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
        >
          Tisk / PDF
        </button>
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
                  <InputRow label="Započítat do PHV">
                    <input type="checkbox" checked={internalInputs.includeManualRewardInAverage} onChange={e => internalInputs.onIncludeManualRewardInAverageChange(e.target.checked)} />
                  </InputRow>
                  <InputRow label="Neplacené volno / absence (h)">
                    <input type="number" className={`${inp} w-14`} value={internalInputs.unworked} onChange={e => internalInputs.onUnworkedChange(parseFloat(e.target.value) || 0)} />
                  </InputRow>
                  <InputRow label="DPN dny z min. měsíce">
                    <input type="number" className={`${inp} w-14`} value={internalInputs.sickCarryoverDays} onChange={e => internalInputs.onSickCarryoverDaysChange(parseFloat(e.target.value) || 0)} />
                  </InputRow>
                </tbody>
              </table>
              <table className="w-full">
                <tbody>
                  {auditRows.map(row => <AuditRowView key={row.label} label={row.label} value={row.value} />)}
                </tbody>
              </table>
            </div>
          </section>

          {issuedPayslipDocument && issuedDocumentRows && (
            <div className="space-y-4">
              <section className="app-controls rounded-lg border border-slate-200 bg-slate-50 p-4 text-[12px] text-slate-600">
                <div className="font-semibold text-slate-900">Výplatní páska pro zaměstnance</div>
                Auditní dokument se renderuje z issued snapshotu uloženého při vystavení výplatní pásky.
                <div className="mt-2">Typ pracovního poměru: {employmentTypeLabel}</div>
                <div className="mt-1">Fond / odpracováno: {issuedDocumentTimeRows.map(row => `${row.label} ${row.hrs || ''} ${row.days || ''}`.trim()).join(' · ')}</div>
                <div className="mt-1">Hrubá mzda a Čistá mzda jsou součástí vystaveného dokumentu níže.</div>
              </section>
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
          )}

          {!issuedPayslipDocument && isDataClosed && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 font-medium text-amber-800">
              Vystavený dokument zatím neexistuje. Tisk je dostupný až po kroku „Vystavit výplatní pásku“.
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

function AuditRowView({ label, value }: AuditRow) {
  return (
    <tr>
      <td className="text-slate-700">{label}</td>
      <td className="text-right text-slate-900">{value}</td>
    </tr>
  )
}
