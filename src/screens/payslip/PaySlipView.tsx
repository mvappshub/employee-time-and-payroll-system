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
  const inp = 'border-b border-gray-300 bg-transparent text-xs outline-none w-20 text-right'

  return (
    <div className="max-w-5xl text-xs">
      <div className="mb-3 flex items-center gap-3">
        <span className="text-sm font-bold">Mzda / Výplatní páska</span>
        <input type="month" value={month} onChange={e => onMonthChange(e.target.value)} className="border-b border-gray-300 bg-transparent text-xs outline-none" />
        <button
          type="button"
          disabled={printDisabled || !issuedPayslipDocument}
          onClick={onPrintDocument}
          className="border border-gray-300 px-2 py-1 text-[11px] text-gray-700 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
        >
          Tisk / PDF
        </button>
      </div>

      <div className="mb-3 text-gray-600">{employeeHeader}</div>

      {blocked && <div className="border border-amber-300 bg-amber-50 px-2 py-1 text-amber-800">{blockedMessage}</div>}
      {loading && <div className="border border-gray-300 bg-gray-50 px-2 py-1 text-gray-600">Načítání PHV...</div>}
      {!loading && error && <div className="border border-red-300 bg-red-50 px-2 py-1 text-red-700">{error}</div>}
      {!loading && info && <div className="mt-2 border border-slate-300 bg-slate-50 px-2 py-1 text-slate-700">{info}</div>}
      {!loading && dataClosedWarning && <div className="mt-2 border border-amber-300 bg-amber-50 px-2 py-1 text-amber-800">{dataClosedWarning}</div>}

      {!blocked && !loading && (
        <div className="space-y-4">
          <section className="rounded border border-gray-300 bg-gray-50 p-3 app-controls">
            <div className="mb-2 font-semibold">Interní mzdové vstupy</div>
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
              <section className="rounded border border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-600 app-controls">
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
            <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-amber-800">
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
      <td className="py-1 pr-3 text-gray-700">{label}</td>
      <td className="py-1 text-right">{children}</td>
    </tr>
  )
}

function AuditRowView({ label, value }: AuditRow) {
  return (
    <tr>
      <td className="py-1 pr-3 text-gray-700">{label}</td>
      <td className="py-1 text-right text-gray-900">{value}</td>
    </tr>
  )
}
