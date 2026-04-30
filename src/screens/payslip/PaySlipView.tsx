import type { ReactNode } from 'react'
import { Loader2, Lock, Printer } from 'lucide-react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
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
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">Mzda / Výplatní páska</h2>
          <div className="mt-0.5 truncate text-xs text-slate-500">{employeeHeader}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {extraActions}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={printDisabled || !issuedPayslipDocument}
            onClick={onPrintDocument}
            leftIcon={<Printer className="h-3.5 w-3.5" />}
          >
            Tisk / PDF
          </Button>
        </div>
      </div>

      {blocked && <EmptyState icon={<Lock />} title="Výpočet není dostupný" description={blockedMessage} className="min-h-[180px]" />}
      {loading && <Alert tone="info" title="Načítání PHV" action={<Loader2 className="h-4 w-4 animate-spin text-blue-600" />} />}
      {!loading && error && <Alert tone="danger">{error}</Alert>}
      {!loading && info && <Alert tone="success">{info}</Alert>}
      {!loading && dataClosedWarning && <Alert tone="warning">{dataClosedWarning}</Alert>}

      {!blocked && !loading && (
        <div className="space-y-3">
          <Card className="app-controls">
            <CardHeader><CardTitle>Interní mzdové vstupy</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  density="compact"
                  label="Ruční odměna"
                  type="number"
                  value={internalInputs.manualReward}
                  onChange={e => internalInputs.onManualRewardChange(parseFloat(e.target.value) || 0)}
                />
                {internalInputs.showHolidayCompensationMode && (
                  <Select
                    density="compact"
                    label="Práce ve svátek"
                    value={internalInputs.holidayCompensationMode}
                    onChange={event => internalInputs.onHolidayCompensationModeChange(event.target.value as HolidayCompensationMode)}
                  >
                    <option value="time-off">Náhradní volno</option>
                    <option value="premium">Proplatit příplatkem</option>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>

          {currentCalculationRows && (
            <Card className="app-controls">
              <CardHeader
                actions={
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div><span className="text-[10px] uppercase tracking-wide text-slate-500">Hrubá mzda</span> <span className="ml-1.5 text-sm font-semibold tabular">{currentCalculationRows.grossWage}</span></div>
                    <div><span className="text-[10px] uppercase tracking-wide text-slate-500">Čistá mzda</span> <span className="ml-1.5 text-sm font-semibold tabular text-emerald-600">{currentCalculationRows.netWage}</span></div>
                  </div>
                }
              >
                <CardTitle>Výpočet mzdy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 lg:grid-cols-2 2xl:grid-cols-3">
                  {currentCalculationRows.sections.map(section => (
                    <section key={section.title} className="rounded-md border border-slate-200 bg-slate-50/50 p-2.5">
                      <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">{section.title}</h3>
                      <table className="w-full">
                        <tbody>
                          {section.rows.map(row => <CalculationRowView key={`${section.title}-${row.label}`} label={row.label} value={row.value} formula={row.formula} />)}
                        </tbody>
                      </table>
                    </section>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {issuedPayslipDocument && issuedDocumentRows && (
            <div className="space-y-3">
              <Alert tone="info" title="Výplatní páska pro zaměstnance">
                Typ pracovního poměru: {employmentTypeLabel}. Fond / odpracováno: {issuedDocumentTimeRows.map(row => `${row.label} ${row.hrs || ''} ${row.days || ''}`.trim()).join(' · ')}. Hrubá mzda a Čistá mzda jsou součástí vystaveného dokumentu níže.
              </Alert>
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
            <Alert tone="warning">
              Vystavený dokument zatím neexistuje. Tisk je dostupný až po schválení a vystavení výplatní pásky.
            </Alert>
          )}
        </div>
      )}
    </div>
  )
}

function CalculationRowView({ label, value, formula }: CalculationRow) {
  return (
    <tr className="border-b border-slate-200 last:border-0">
      <td className="py-1 pr-2 align-top">
        <div className="text-[11px] font-medium leading-tight text-slate-800">{label}</div>
        <div className="mt-0.5 text-[10px] leading-tight text-slate-500">{formula}</div>
      </td>
      <td className="whitespace-nowrap py-1 text-right align-top text-[11px] font-semibold tabular text-slate-900">{value}</td>
    </tr>
  )
}
