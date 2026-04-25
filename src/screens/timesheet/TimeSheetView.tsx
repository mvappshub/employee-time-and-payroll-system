import type { TimeSheetStatementDocument } from '../../domain/shared/types'
import { TimeSheetStatementDocumentView } from '../documents/TimeSheetStatementDocumentView'

type ShiftOption = { value: string; label: string }

type TimeSheetRow = {
  key: string
  dayName: string
  dateLabel: string
  shift: string
  arrival: string
  departure: string
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
}

export function TimeSheetView({
  title,
  month,
  emptyState,
  info,
  error,
  showDocumentPreview,
  timeSheetDocument,
  canPreviewDocument,
  documentBlockedReason,
  shiftOptions,
  summary,
  rows,
  onMonthChange,
  onResetMonth,
  onToggleDocumentPreview,
  onPrintDocument,
  onShiftChange,
  onArrivalChange,
  onDepartureChange,
}: TimeSheetViewProps) {
  const selectClass = 'w-full cursor-pointer bg-transparent text-xs outline-none'
  const timeInputClass = 'w-16 bg-transparent text-xs outline-none'

  return (
    <div className="relative text-xs">
      <div className="mb-1 flex items-center gap-3">
        <span className="text-sm font-bold">Evidence docházky</span>
        <span className="text-slate-600">{title}</span>
        <input type="month" value={month} onChange={e => onMonthChange(e.target.value)} className="border-b border-gray-300 bg-transparent text-xs outline-none" />
        <button className="border border-slate-300 px-2 py-1 text-[11px] text-slate-700" onClick={onResetMonth}>Reset</button>
        <button className="border border-slate-300 px-2 py-1 text-[11px] text-slate-700 disabled:border-slate-200 disabled:text-slate-400" onClick={onToggleDocumentPreview} disabled={!canPreviewDocument}>
          {showDocumentPreview ? 'Skrýt výpis evidence' : 'Náhled výpisu evidence'}
        </button>
        <button className="border border-slate-300 px-2 py-1 text-[11px] text-slate-700 disabled:border-slate-200 disabled:text-slate-400" onClick={onPrintDocument} disabled={!canPreviewDocument}>
          Tisk / PDF
        </button>
      </div>
      <div className="mb-2 flex gap-6 text-xs text-gray-700">
        <span>Pracovní dny: <strong>{summary.calendarWorkDays}</strong></span>
        <span>Volné dny: <strong>{summary.freeDaysInMonth}</strong></span>
        <span>Svátky: <strong>{summary.holidayDaysInMonth}</strong></span>
        <span>Fond hodin: <strong>{summary.monthlyFundHours}</strong></span>
      </div>
      {emptyState && <div className="mb-3 border border-amber-300 bg-amber-50 px-2 py-1 text-amber-800">{emptyState}</div>}
      {!emptyState && documentBlockedReason && <div className="mb-3 border border-amber-300 bg-amber-50 px-2 py-1 text-amber-800">{documentBlockedReason}</div>}
      {!emptyState && info && <div className="mb-3 border border-green-300 bg-green-50 px-2 py-1 text-green-700">{info}</div>}
      {!emptyState && error && <div className="mb-3 border border-red-300 bg-red-50 px-2 py-1 text-red-700">{error}</div>}
      {!emptyState && <div className="overflow-x-auto">
        <table className="whitespace-nowrap border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-gray-400">
              {['Den', 'Datum', 'Směna', 'Příchod', 'Odchod', 'Přest.', 'Odprac.', 'Plán', 'Sv.kr.', 'Dovol.', 'Nemoc', 'Noční', 'Víkend', 'Svátek', 'Přesčas', 'Saldo', 'Svátek/pozn.'].map(header => (
                <th key={header} className="px-0.5 text-left font-normal text-gray-600">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.key} className={row.rowClass}>
                <td className={`px-0.5 ${row.isWeekend ? 'font-bold' : ''}`}>{row.dayName}</td>
                <td className="px-0.5">{row.dateLabel}</td>
                <td className="px-0.5">
                  <select value={row.shift} onChange={e => onShiftChange(index, e.target.value)} className={selectClass}>
                    {shiftOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </td>
                <td className="px-0.5">
                  {row.isTimeEditable ? <input type="time" value={row.arrival} onChange={e => onArrivalChange(index, e.target.value)} className={timeInputClass} /> : ''}
                </td>
                <td className="px-0.5">
                  {row.isTimeEditable ? <input type="time" value={row.departure} onChange={e => onDepartureChange(index, e.target.value)} className={timeInputClass} /> : ''}
                </td>
                <td className="px-0.5 text-right">{row.breakHours}</td>
                <td className="px-0.5 text-right font-medium">{row.worked}</td>
                <td className="px-0.5 text-right">{row.planHours}</td>
                <td className="px-0.5 text-right">{row.holidayCredit}</td>
                <td className="px-0.5 text-right">{row.vacation}</td>
                <td className="px-0.5 text-right">{row.sick}</td>
                <td className="px-0.5 text-right">{row.nightHours}</td>
                <td className="px-0.5 text-right">{row.weekendHours}</td>
                <td className="px-0.5 text-right">{row.holidayTotal}</td>
                <td className="px-0.5 text-right">{row.overtime}</td>
                <td className={`px-0.5 text-right ${row.saldo < 0 ? 'text-red-600' : row.saldo > 0 ? 'text-green-700' : ''}`}>
                  {row.saldo !== 0 ? `${row.saldo > 0 ? '+' : ''}${row.saldo.toFixed(1)}` : ''}
                </td>
                <td className="max-w-[120px] truncate px-0.5 text-[10px] text-gray-500">{row.holidayName}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-400 font-bold">
              <td className="px-0.5" colSpan={5}>Σ celkem</td>
              <td className="px-0.5 text-right"></td>
              <td className="px-0.5 text-right">{summary.workedHours}</td>
              <td className="px-0.5 text-right">{summary.workHoursWH}</td>
              <td className="px-0.5 text-right">{summary.totalHolidayCredit}</td>
              <td className="px-0.5 text-right">{summary.totalVacation}</td>
              <td className="px-0.5 text-right">{summary.totalSick}</td>
              <td className="px-0.5 text-right">{summary.totalNight}</td>
              <td className="px-0.5 text-right">{summary.totalWeekend}</td>
              <td className="px-0.5 text-right">{summary.totalHolidayTotal}</td>
              <td className="px-0.5 text-right">{summary.totalOvertime}</td>
              <td className={`px-0.5 text-right ${summary.totalSaldo < 0 ? 'text-red-600' : summary.totalSaldo > 0 ? 'text-green-700' : ''}`}>
                {summary.totalSaldo !== 0 ? `${summary.totalSaldo > 0 ? '+' : ''}${summary.totalSaldo.toFixed(1)}` : '0.0'}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>}
      {timeSheetDocument && (
        <div
          className={showDocumentPreview ? 'mt-6' : 'document-print-only'}
          aria-hidden={showDocumentPreview ? undefined : 'true'}
        >
          <TimeSheetStatementDocumentView document={timeSheetDocument} />
        </div>
      )}
    </div>
  )
}
