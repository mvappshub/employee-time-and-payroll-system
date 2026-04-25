import type { EmployeeSettings, EmployerProfile } from '../../domain/shared/types'

type Option = { value: string; label: string }

export interface EmployeeViewProps {
  employer: EmployerProfile
  employee: EmployeeSettings
  dailyFundLabel: string
  employmentTypeOptions: Option[]
  remunerationTypeOptions: Option[]
  holidayCompensationOptions: Option[]
  overtimeCompensationOptions: Option[]
  onEmployerChange: (field: keyof EmployerProfile, value: string) => void
  onEmployeeChange: (field: keyof EmployeeSettings, value: string | number | boolean) => void
}

const inp = 'border-b border-slate-200 outline-none bg-transparent px-1 py-1 text-[13px] text-slate-700 transition-colors duration-150 focus:border-slate-400'

export function EmployeeView({
  employer,
  employee,
  dailyFundLabel,
  employmentTypeOptions,
  remunerationTypeOptions,
  holidayCompensationOptions,
  overtimeCompensationOptions,
  onEmployerChange,
  onEmployeeChange,
}: EmployeeViewProps) {
  const employerTxt = (key: keyof EmployerProfile, label: string, w = 'w-64') => (
    <tr key={key}>
      <td className="whitespace-nowrap pr-6 align-top text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</td>
      <td><input className={`${inp} ${w}`} value={employer[key]} onChange={e => onEmployerChange(key, e.target.value)} /></td>
    </tr>
  )

  const txt = (key: keyof EmployeeSettings, label: string, w = 'w-48') => (
    <tr key={key}>
      <td className="whitespace-nowrap pr-6 align-top text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</td>
      <td><input className={`${inp} ${w}`} value={employee[key] as string} onChange={e => onEmployeeChange(key, e.target.value)} /></td>
    </tr>
  )

  const num = (key: keyof EmployeeSettings, label: string, step = 1, w = 'w-20') => (
    <tr key={key}>
      <td className="whitespace-nowrap pr-6 align-top text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</td>
      <td><input type="number" step={step} className={`${inp} ${w}`} value={employee[key] as number} onChange={e => onEmployeeChange(key, parseFloat(e.target.value) || 0)} /></td>
    </tr>
  )

  const pct = (key: keyof EmployeeSettings, label: string) => (
    <tr key={key}>
      <td className="whitespace-nowrap pr-6 align-top text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</td>
      <td>
        <input type="number" step={1} className={`${inp} w-16`} value={Math.round((employee[key] as number) * 100)} onChange={e => onEmployeeChange(key, (parseFloat(e.target.value) || 0) / 100)} />
        <span className="ml-1 text-slate-300">%</span>
      </td>
    </tr>
  )

  const chk = (key: keyof EmployeeSettings, label: string) => (
    <tr key={key}>
      <td className="whitespace-nowrap pr-6 align-top text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</td>
      <td><input type="checkbox" checked={employee[key] as boolean} onChange={e => onEmployeeChange(key, e.target.checked)} /></td>
    </tr>
  )

  const conditionalChk = (key: keyof EmployeeSettings, label: string, disabled: boolean) => (
    <tr key={key}>
      <td className="whitespace-nowrap pr-6 align-top text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</td>
      <td><input type="checkbox" checked={employee[key] as boolean} disabled={disabled} onChange={e => onEmployeeChange(key, e.target.checked)} /></td>
    </tr>
  )

  const time = (key: keyof EmployeeSettings, label: string) => (
    <tr key={key}>
      <td className="whitespace-nowrap pr-6 align-top text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</td>
      <td><input type="time" className={`${inp} w-24`} value={employee[key] as string} onChange={e => onEmployeeChange(key, e.target.value)} /></td>
    </tr>
  )

  const date = (key: keyof EmployeeSettings, label: string) => (
    <tr key={key}>
      <td className="whitespace-nowrap pr-6 align-top text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</td>
      <td><input type="date" className={`${inp} w-36`} value={employee[key] as string} onChange={e => onEmployeeChange(key, e.target.value)} /></td>
    </tr>
  )

  const sel = (key: keyof EmployeeSettings, label: string, options: Option[]) => (
    <tr key={key}>
      <td className="whitespace-nowrap pr-6 align-top text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</td>
      <td>
        <select className={`${inp} w-28`} value={employee[key] as string} onChange={e => onEmployeeChange(key, e.target.value)}>
          {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </td>
    </tr>
  )

  return (
    <div className="w-full max-w-[1500px] text-xs">
      <div className="mb-8 text-[12px] uppercase tracking-[0.28em] text-slate-400">Firma a zaměstnanec</div>
      <div className="mb-10">
        <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">Zaměstnavatel</div>
        <table>
          <tbody>
            {employerTxt('name', 'Název zaměstnavatele')}
            {employerTxt('ico', 'IČO', 'w-32')}
            {employerTxt('seat', 'Sídlo')}
          </tbody>
        </table>
      </div>
      <div className="grid gap-x-14 gap-y-10 xl:grid-cols-3">
        <table className="align-top">
          <tbody>
            {txt('name', 'Jméno zaměstnance')}
            {txt('employeeNumber', 'Osobní číslo', 'w-24')}
            {sel('employmentType', 'Druh pracovněprávního vztahu', employmentTypeOptions)}
            {date('employmentStartDate', 'Datum nástupu')}
            {sel('remunerationType', 'Režim odměňování', remunerationTypeOptions)}
            {num('workload', 'Úvazek', 0.1)}
            {num('weeklyHours', 'Týdenní fond hodin')}
            {num('workDaysPerWeek', 'Pracovní dny v týdnu', 1, 'w-12')}
            <tr>
              <td className="pr-6 align-top text-[11px] uppercase tracking-[0.18em] text-slate-400">Denní fond hodin</td>
              <td className="py-1 text-[13px] font-semibold text-slate-900">{dailyFundLabel}</td>
            </tr>
            {chk('weekendWorking', 'Víkend je běžně pracovní')}
          </tbody>
        </table>
        <table className="align-top">
          <tbody>
            {time('shiftStart', 'Standardní začátek směny')}
            {time('shiftEnd', 'Standardní konec směny')}
            {num('standardBreak', 'Standardní přestávka (h)', 0.25, 'w-12')}
            {chk('nightWorkAllowed', 'Noční práce povolena')}
            {time('nightFrom', 'Noční pásmo od')}
            {time('nightTo', 'Noční pásmo do')}
            {chk('overtimeAllowed', 'Přesčas povolen')}
          </tbody>
        </table>
        <table className="align-top">
          <tbody>
            {num('baseSalary', 'Základní hrubá mzda (Kč)', 100, 'w-24')}
            {pct('personalBonus', 'Osobní ohodnocení')}
            {pct('nightSurcharge', 'Příplatek noční')}
            {pct('weekendSurcharge', 'Příplatek víkend')}
            {pct('holidaySurcharge', 'Příplatek svátek')}
            {pct('overtimeSurcharge', 'Příplatek přesčas')}
            {pct('sickCompensation', 'Náhrada nemoc')}
            {chk('appliesHealthMinimumBase', 'Uplatnit minimální základ ZP')}
            {!employee.appliesHealthMinimumBase && txt('healthMinimumBaseExceptionReason', 'Důvod výjimky min. ZP', 'w-64')}
            {chk('taxDeclarationSigned', 'Podepsané prohlášení poplatníka')}
            {conditionalChk('taxpayerCreditApplied', 'Uplatnit slevu na poplatníka', !employee.taxDeclarationSigned)}
            {num('vacationEntitlementHours', 'Dovolená - roční nárok (h)', 1, 'w-20')}
            {num('vacationUsedHours', 'Dovolená - vyčerpáno (h)', 1, 'w-20')}
            {num('vacationRemainingHours', 'Dovolená - zůstatek (h)', 1, 'w-20')}
            {sel('holidayCompensationMode', 'Svátek - vypořádání', holidayCompensationOptions)}
            {sel('overtimeCompensationMode', 'Přesčas - vypořádání', overtimeCompensationOptions)}
          </tbody>
        </table>
      </div>
    </div>
  )
}
