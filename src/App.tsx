import { useStore } from './store'
import Employee from './Employee'
import TimeSheet from './TimeSheet'
import PaySlip from './PaySlip'
import Holidays from './Holidays'
import MonthControls from './MonthControls'

const NAV = [
  { key: 'employee', label: 'Zaměstnanec' },
  { key: 'timesheet', label: 'Evidence' },
  { key: 'payslip', label: 'Výplatní páska' },
  { key: 'holidays', label: 'Svátky' },
] as const

export default function App() {
  const section = useStore(s => s.section)
  const setSection = useStore(s => s.setSection)

  return (
    <div className="flex h-screen text-xs text-black bg-white">
      <nav className="w-32 shrink-0 border-r border-gray-200 pt-1">
        {NAV.map(n => (
          <div key={n.key}
            onClick={() => setSection(n.key)}
            className={`cursor-pointer py-0.5 px-1 select-none ${section === n.key ? 'text-blue-600 font-bold' : 'text-black'}`}>
            {n.label}
          </div>
        ))}
      </nav>
      <main className="flex-1 overflow-auto p-1">
        <MonthControls />
        {section === 'employee' && <Employee />}
        {section === 'timesheet' && <TimeSheet />}
        {section === 'payslip' && <PaySlip />}
        {section === 'holidays' && <Holidays />}
      </main>
    </div>
  )
}
