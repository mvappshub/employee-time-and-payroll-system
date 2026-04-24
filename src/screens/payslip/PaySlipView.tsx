import type { ReactNode } from 'react'

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
type EmployeeDocument = {
  employerName: string
  employerIco: string
  employerSeat: string
  employeeName: string
  employeeNumber: string
  employmentTypeLabel: string
  periodLabel: string
  timeRows: PayslipRow[]
  earningsRows: PayslipRow[]
  contributionRows: PayslipRow[]
  taxRows: PayslipRow[]
  grossWage: string
  netWage: string
  recapRows: PayslipRow[]
}

export interface PaySlipViewProps {
  month: string
  employeeHeader: string
  loading: boolean
  error: string
  isDataClosed: boolean
  printDisabled: boolean
  dataClosedWarning: string
  internalInputs: InternalInputProps
  auditRows: AuditRow[]
  employeeDocument: EmployeeDocument | null
  onMonthChange: (month: string) => void
}

export function PaySlipView({
  month,
  employeeHeader,
  loading,
  error,
  isDataClosed,
  printDisabled,
  dataClosedWarning,
  internalInputs,
  auditRows,
  employeeDocument,
  onMonthChange,
}: PaySlipViewProps) {
  const inp = 'border-b border-gray-300 bg-transparent text-xs outline-none w-20 text-right'

  return (
    <div className="max-w-4xl text-xs">
      <div className="mb-3 flex items-center gap-3">
        <span className="text-sm font-bold">Výplatní páska</span>
        <input type="month" value={month} onChange={e => onMonthChange(e.target.value)} className="border-b border-gray-300 bg-transparent text-xs outline-none" />
      </div>

      <div className="mb-3 text-gray-600">{employeeHeader}</div>

      {loading && <div className="border border-gray-300 bg-gray-50 px-2 py-1 text-gray-600">Načítání PHV...</div>}
      {!loading && error && <div className="border border-red-300 bg-red-50 px-2 py-1 text-red-700">{error}</div>}
      {!loading && dataClosedWarning && <div className="mt-2 border border-amber-300 bg-amber-50 px-2 py-1 text-amber-800">{dataClosedWarning}</div>}

      {!loading && !printDisabled && employeeDocument && (
        <div className="space-y-4">
          <section className="rounded border border-gray-300 bg-gray-50 p-3">
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

          <section className="rounded border border-gray-300 bg-white p-3">
            <div className="mb-3 border-b border-gray-200 pb-2">
              <div className="text-sm font-semibold">Výplatní páska pro zaměstnance</div>
              {!isDataClosed && <div className="mt-1 text-[11px] text-amber-700">Tisk je dostupný až po uzavření dat měsíce.</div>}
              <div className="mt-2 grid gap-3 text-[11px] text-gray-700 md:grid-cols-2">
                <div>
                  {employeeDocument.employerName && <div className="font-semibold text-black">{employeeDocument.employerName}</div>}
                  {employeeDocument.employerIco && <div>IČO: {employeeDocument.employerIco}</div>}
                  {employeeDocument.employerSeat && <div>Sídlo: {employeeDocument.employerSeat}</div>}
                </div>
                <div>
                  {employeeDocument.employeeName && <div className="font-semibold text-black">{employeeDocument.employeeName}</div>}
                  {employeeDocument.employeeNumber && <div>Osobní číslo: {employeeDocument.employeeNumber}</div>}
                  <div>{employeeDocument.employmentTypeLabel}</div>
                  <div>Období: {employeeDocument.periodLabel}</div>
                </div>
              </div>
            </div>
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-gray-400">
                  <th className="w-1/2 text-left font-normal text-gray-600">Položka</th>
                  <th className="w-16 text-right font-normal text-gray-600">h</th>
                  <th className="w-12 text-right font-normal text-gray-600">dnů</th>
                  <th className="w-24 text-right font-normal text-gray-600">Kč</th>
                </tr>
              </thead>
              <tbody>
                {employeeDocument.timeRows.map(row => <PayslipRowView key={row.label} row={row} />)}
                <tr className="border-t border-gray-200"><td colSpan={4}></td></tr>
                {employeeDocument.earningsRows.map(row => <PayslipRowView key={row.label} row={row} />)}
                <tr className="border-t-2 border-gray-400 font-bold">
                  <td className="py-0.5">Hrubá mzda</td>
                  <td></td><td></td><td className="text-right">{employeeDocument.grossWage}</td>
                </tr>
                <tr className="border-t border-gray-200"><td colSpan={4}></td></tr>
                {employeeDocument.contributionRows.map(row => <PayslipRowView key={row.label} row={row} />)}
                <tr className="border-t border-gray-200"><td colSpan={4}></td></tr>
                {employeeDocument.taxRows.map(row => <PayslipRowView key={row.label} row={row} />)}
                <tr className="border-t-2 border-gray-400 text-sm font-bold">
                  <td className="py-0.5">Čistá mzda</td>
                  <td></td><td></td><td className="text-right">{employeeDocument.netWage}</td>
                </tr>
                <tr className="border-t border-gray-200"><td colSpan={4}></td></tr>
                {employeeDocument.recapRows.map(row => <PayslipRowView key={row.label} row={row} />)}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {!loading && printDisabled && (
        <section className="rounded border border-amber-300 bg-amber-50 p-3 text-[12px] text-amber-900">
          Tiskový obsah výplatní pásky je dostupný až po uzavření nebo schválení měsíce.
        </section>
      )}
    </div>
  )
}

function PayslipRowView({ row }: { row: PayslipRow }) {
  return (
    <tr className={row.bold ? 'font-bold' : ''}>
      <td className="py-0.5">{row.label}</td>
      <td className="text-right">{row.hrs ?? ''}</td>
      <td className="text-right">{row.days ?? ''}</td>
      <td className={`text-right ${row.neg ? 'text-red-600' : ''}`}>{row.czk ?? ''}</td>
    </tr>
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
