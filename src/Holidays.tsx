import { useState } from 'react'
import { useStore } from './store'

export default function Holidays() {
  const holidays = useStore(s => s.holidays)
  const addHoliday = useStore(s => s.addHoliday)
  const removeHoliday = useStore(s => s.removeHoliday)
  const updateHoliday = useStore(s => s.updateHoliday)
  const [newDate, setNewDate] = useState('')
  const [newName, setNewName] = useState('')

  const inp = 'border-b border-gray-300 outline-none bg-transparent text-xs py-0 px-0.5'

  return (
    <div className="text-xs">
      <div className="font-bold text-sm mb-1">Svátky</div>
      <table className="w-full max-w-xl">
        <thead>
          <tr className="border-b border-gray-400 text-left">
            <th className="w-28 font-normal text-gray-600">Datum</th>
            <th className="font-normal text-gray-600">Název</th>
            <th className="w-12"></th>
          </tr>
        </thead>
        <tbody>
          {holidays.map((h, i) => (
            <tr key={i} className={i % 2 ? 'bg-gray-50' : ''}>
              <td>
                <input type="date" className={`${inp} w-28`} value={h.date}
                  onChange={e => updateHoliday(i, { ...h, date: e.target.value })} />
              </td>
              <td>
                <input className={`${inp} w-full`} value={h.name}
                  onChange={e => updateHoliday(i, { ...h, name: e.target.value })} />
              </td>
              <td>
                <span className="text-red-600 cursor-pointer select-none" onClick={() => removeHoliday(i)}>×</span>
              </td>
            </tr>
          ))}
          <tr className="border-t border-gray-300">
            <td>
              <input type="date" className={`${inp} w-28`} value={newDate} onChange={e => setNewDate(e.target.value)} />
            </td>
            <td>
              <input className={`${inp} w-full`} value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="název svátku" />
            </td>
            <td>
              <span className="text-blue-600 cursor-pointer select-none"
                onClick={() => { if (newDate && newName) { addHoliday({ date: newDate, name: newName }); setNewDate(''); setNewName('') } }}>+</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
