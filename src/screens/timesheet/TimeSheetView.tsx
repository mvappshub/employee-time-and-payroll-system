import type { ReactNode } from 'react'
import { FileText, Printer, RotateCcw } from 'lucide-react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import type { TimeSheetStatementDocument } from '../../domain/shared/types'
import { cn } from '../../utils/cn'
import { TimeSheetStatementDocumentView } from '../documents/TimeSheetStatementDocumentView'

type ShiftOption = { value: string; label: string }

type TimeSheetRow = {
  key: string
  dayName: string
  dateLabel: string
  shift: string
  arrival: string
  departure: string
  breakStart: string
  breakEnd: string
  breakHours: string
  worked: string
  planHours: string
  holidayCredit: string
  vacation: string
  sick: string
  nightHours: string
  weekendHours: string
  holidayTotal: string
  overtime: string
  saldo: number
  holidayName: string
  isWeekend: boolean
  rowClass: string
  isTimeEditable: boolean
}

type TimeSheetSummary = {
  calendarWorkDays: number
  freeDaysInMonth: number
  holidayDaysInMonth: number
  monthlyFundHours: string
  workedHours: string
  workHoursWH: string
  totalHolidayCredit: string
  totalVacation: string
  totalSick: string
  totalNight: string
  totalWeekend: string
  totalHolidayTotal: string
  totalOvertime: string
  totalSaldo: number
}

export interface TimeSheetViewProps {
  title: string
  month: string
  emptyState?: string
  info: string
  error: string
  showDocumentPreview: boolean
  timeSheetDocument: TimeSheetStatementDocument | null
  canPreviewDocument: boolean
  documentBlockedReason: string
  extraActions?: ReactNode
  shiftOptions: ShiftOption[]
  summary: TimeSheetSummary
  rows: TimeSheetRow[]
  onMonthChange: (month: string) => void
  onResetMonth: () => void
  onToggleDocumentPreview: () => void
  onPrintDocument: () => void | Promise<void>
  onShiftChange: (index: number, shift: string) => void
  onArrivalChange: (index: number, value: string) => void
  onDepartureChange: (index: number, value: string) => void
  onBreakStartChange: (index: number, value: string) => void
  onBreakEndChange: (index: number, value: string) => void
}

export function TimeSheetView({
  title,
  emptyState,
  info,
  error,
  showDocumentPreview,
  timeSheetDocument,
  canPreviewDocument,
  documentBlockedReason,
  extraActions,
  shiftOptions,
  summary,
  rows,
  onResetMonth,
  onToggleDocumentPreview,
  onPrintDocument,
  onShiftChange,
  onArrivalChange,
  onDepartureChange,
  onBreakStartChange,
  onBreakEndChange,
}: TimeSheetViewProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-sm font-semibold text-slate-900">{title}</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="xs" leftIcon={<RotateCcw className="h-3 w-3" />} onClick={onResetMonth}>Reset</Button>
          <Button variant="secondary" size="xs" leftIcon={<FileText className="h-3 w-3" />} disabled={!canPreviewDocument} onClick={onToggleDocumentPreview}>
            {showDocumentPreview ? 'Skrýt náhled' : 'Náhled'}
          </Button>
          <Button variant="secondary" size="xs" leftIcon={<Printer className="h-3 w-3" />} disabled={!canPreviewDocument} onClick={onPrintDocument}>
            Tisk / PDF
          </Button>
          {extraActions}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600">
        <span>Pracovní dny: <strong className="tabular text-slate-900">{summary.calendarWorkDays}</strong></span>
        <span className="text-slate-300">·</span>
        <span>Volné dny: <strong className="tabular text-slate-900">{summary.freeDaysInMonth}</strong></span>
        <span className="text-slate-300">·</span>
        <span>Svátky: <strong className="tabular text-slate-900">{summary.holidayDaysInMonth}</strong></span>
        <span className="text-slate-300">·</span>
        <span>Fond: <strong className="tabular text-slate-900">{summary.monthlyFundHours} h</strong></span>
      </div>

      {emptyState && <Alert tone="warning">{emptyState}</Alert>}
      {!emptyState && documentBlockedReason && <Alert tone="warning">{documentBlockedReason}</Alert>}
      {!emptyState && info && <Alert tone="success">{info}</Alert>}
      {!emptyState && error && <Alert tone="danger">{error}</Alert>}

      {!emptyState && (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="w-full border-collapse text-[11px]">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-600">
              <tr>
                {['Den', 'Datum', 'Směna', 'Příchod', 'Odchod', 'Přest. od', 'Přest. do', 'Přest.', 'Odprac.', 'Plán', 'Sv.kr.', 'Dovol.', 'Nemoc', 'Noční', 'Víkend', 'Svátek', 'Přesčas', 'Saldo', 'Svátek/pozn.'].map(h => (
                  <th key={h} className="whitespace-nowrap border-b border-slate-200 px-1.5 py-1.5 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.key}
                  className={cn(
                    'h-7 border-b border-slate-100',
                    row.isWeekend && !row.holidayName && 'bg-slate-50/60',
                    row.holidayName && 'bg-amber-50/50',
                  )}
                >
                  <td className={cn('px-1.5 whitespace-nowrap', row.isWeekend && 'font-semibold text-slate-700')}>{row.dayName}</td>
                  <td className="whitespace-nowrap px-1.5 tabular text-slate-600">{row.dateLabel}</td>
                  <td className="px-1.5">
                    <select
                      value={row.shift}
                      onChange={e => onShiftChange(index, e.target.value)}
                      className="h-5 w-full rounded border border-transparent bg-transparent px-0.5 text-[11px] hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                    >
                      {shiftOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </td>
                  <td className="px-1.5">
                    {row.isTimeEditable ? (
                      <input
                        type="time"
                        value={row.arrival}
                        onChange={e => onArrivalChange(index, e.target.value)}
                        className="h-5 w-[72px] rounded border border-transparent bg-transparent px-0.5 text-[11px] tabular hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                      />
                    ) : ''}
                  </td>
                  <td className="px-1.5">
                    {row.isTimeEditable ? (
                      <input
                        type="time"
                        value={row.departure}
                        onChange={e => onDepartureChange(index, e.target.value)}
                        className="h-5 w-[72px] rounded border border-transparent bg-transparent px-0.5 text-[11px] tabular hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                      />
                    ) : ''}
                  </td>
                  <td className="px-1.5">
                    {row.isTimeEditable ? (
                      <input
                        type="time"
                        value={row.breakStart}
                        onChange={e => onBreakStartChange(index, e.target.value)}
                        className="h-5 w-[72px] rounded border border-transparent bg-transparent px-0.5 text-[11px] tabular hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                      />
                    ) : ''}
                  </td>
                  <td className="px-1.5">
                    {row.isTimeEditable ? (
                      <input
                        type="time"
                        value={row.breakEnd}
                        onChange={e => onBreakEndChange(index, e.target.value)}
                        className="h-5 w-[72px] rounded border border-transparent bg-transparent px-0.5 text-[11px] tabular hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                      />
                    ) : ''}
                  </td>
                  <td className="px-1.5 text-center tabular text-slate-500">{row.breakHours}</td>
                  <td className="px-1.5 text-center tabular font-medium text-slate-900">{row.worked}</td>
                  <td className="px-1.5 text-center tabular text-slate-500">{row.planHours}</td>
                  <td className="px-1.5 text-center tabular text-slate-500">{row.holidayCredit}</td>
                  <td className="px-1.5 text-center tabular text-slate-500">{row.vacation}</td>
                  <td className="px-1.5 text-center tabular text-slate-500">{row.sick}</td>
                  <td className="px-1.5 text-center tabular text-slate-500">{row.nightHours}</td>
                  <td className="px-1.5 text-center tabular text-slate-500">{row.weekendHours}</td>
                  <td className="px-1.5 text-center tabular text-slate-500">{row.holidayTotal}</td>
                  <td className="px-1.5 text-center tabular text-slate-500">{row.overtime}</td>
                  <td className={cn('px-1.5 text-center tabular', row.saldo < 0 && 'font-medium text-red-600', row.saldo > 0 && 'font-medium text-emerald-600')}>
                    {row.saldo !== 0 ? `${row.saldo > 0 ? '+' : ''}${row.saldo.toFixed(1)}` : ''}
                  </td>
                  <td className="max-w-[140px] truncate px-1.5 text-[10px] text-slate-500">{row.holidayName}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="h-7 border-t-2 border-slate-300 bg-slate-50 font-semibold text-slate-900">
                <td className="px-1.5" colSpan={7}>Σ celkem</td>
                <td className="px-1.5 text-center tabular"></td>
                <td className="px-1.5 text-center tabular">{summary.workedHours}</td>
                <td className="px-1.5 text-center tabular">{summary.workHoursWH}</td>
                <td className="px-1.5 text-center tabular">{summary.totalHolidayCredit}</td>
                <td className="px-1.5 text-center tabular">{summary.totalVacation}</td>
                <td className="px-1.5 text-center tabular">{summary.totalSick}</td>
                <td className="px-1.5 text-center tabular">{summary.totalNight}</td>
                <td className="px-1.5 text-center tabular">{summary.totalWeekend}</td>
                <td className="px-1.5 text-center tabular">{summary.totalHolidayTotal}</td>
                <td className="px-1.5 text-center tabular">{summary.totalOvertime}</td>
                <td className={cn('px-1.5 text-center tabular', summary.totalSaldo < 0 && 'text-red-600', summary.totalSaldo > 0 && 'text-emerald-600')}>
                  {summary.totalSaldo !== 0 ? `${summary.totalSaldo > 0 ? '+' : ''}${summary.totalSaldo.toFixed(1)}` : '0.0'}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {timeSheetDocument && (
        <div className={showDocumentPreview ? 'mt-4' : 'document-print-only'} aria-hidden={showDocumentPreview ? undefined : 'true'}>
          <TimeSheetStatementDocumentView document={timeSheetDocument} />
        </div>
      )}
    </div>
  )
}
