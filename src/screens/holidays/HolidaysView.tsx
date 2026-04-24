import type { Holiday } from '../../domain/shared/types'

export interface HolidaysViewProps {
  holidays: Holiday[]
  newDate: string
  newName: string
  onNewDateChange: (value: string) => void
  onNewNameChange: (value: string) => void
  onHolidayChange: (index: number, holiday: Holiday) => void
  onHolidayRemove: (index: number) => void
  onHolidayAdd: () => void
}

const inp = 'border-b border-gray-300 outline-none bg-transparent text-xs py-0 px-0.5'

export function HolidaysView({
  holidays,
  newDate,
  newName,
  onNewDateChange,
  onNewNameChange,
  onHolidayChange,
  onHolidayRemove,
  onHolidayAdd,
}: HolidaysViewProps) {
  return (
    <div className="text-xs">
      <div className="mb-1 text-sm font-bold">Svátky</div>
      <table className="w-full max-w-xl">
        <thead>
          <tr className="border-b border-gray-400 text-left">
            <th className="w-28 font-normal text-gray-600">Datum</th>
            <th className="font-normal text-gray-600">Název</th>
            <th className="w-12"></th>
          </tr>
        </thead>
        <tbody>
          {holidays.map((holiday, index) => (
            <tr key={`${holiday.date}-${index}`} className={index % 2 ? 'bg-gray-50' : ''}>
              <td>
                <input type="date" className={`${inp} w-28`} value={holiday.date} onChange={e => onHolidayChange(index, { ...holiday, date: e.target.value })} />
              </td>
              <td>
                <input className={`${inp} w-full`} value={holiday.name} onChange={e => onHolidayChange(index, { ...holiday, name: e.target.value })} />
              </td>
              <td>
                <span className="cursor-pointer select-none text-red-600" onClick={() => onHolidayRemove(index)}>×</span>
              </td>
            </tr>
          ))}
          <tr className="border-t border-gray-300">
            <td>
              <input type="date" className={`${inp} w-28`} value={newDate} onChange={e => onNewDateChange(e.target.value)} />
            </td>
            <td>
              <input className={`${inp} w-full`} value={newName} onChange={e => onNewNameChange(e.target.value)} placeholder="název svátku" />
            </td>
            <td>
              <span className="cursor-pointer select-none text-blue-600" onClick={onHolidayAdd}>+</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
