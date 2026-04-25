import type { ReactNode } from 'react'
import type { EmployeeSettings } from '../../domain/shared/types'

export interface EmployeeDetailProps {
  employee: EmployeeSettings | null
  error: string
  info: string
  onEmployeeChange: (field: keyof EmployeeSettings, value: string | number | boolean) => void
  onSaveEmployee: () => void
}

const inp = 'w-full border border-slate-200 bg-white px-2 py-1 text-[12px] outline-none'

function InputRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{label}</span>
      {children}
    </label>
  )
}

export function EmployeeDetail({ employee, error, info, onEmployeeChange, onSaveEmployee }: EmployeeDetailProps) {
  if (!employee) {
    return <section className="rounded border border-slate-200 bg-white p-4 text-slate-500">Vyberte zaměstnance nebo založte novou kartu.</section>
  }

  return (
    <section className="rounded border border-slate-200 bg-white p-4">
      <div className="mb-4 text-sm font-semibold text-slate-900">Karta zaměstnance</div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">Identifikace</div>
            <div className="grid gap-3">
              <InputRow label="Jméno">
                <input className={inp} value={employee.name} onChange={e => onEmployeeChange('name', e.target.value)} />
              </InputRow>
              <InputRow label="Osobní číslo">
                <input className={inp} value={employee.employeeNumber} onChange={e => onEmployeeChange('employeeNumber', e.target.value)} />
              </InputRow>
              <InputRow label="Datum nástupu">
                <input type="date" className={inp} value={employee.employmentStartDate} onChange={e => onEmployeeChange('employmentStartDate', e.target.value)} />
              </InputRow>
              <InputRow label="Datum ukončení">
                <input type="date" className={inp} value={employee.employmentEndDate || ''} onChange={e => onEmployeeChange('employmentEndDate', e.target.value)} />
              </InputRow>
            </div>
          </div>
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">Pracovní údaje</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <InputRow label="Úvazek">
                <input type="number" step="0.1" className={inp} value={employee.workload} onChange={e => onEmployeeChange('workload', parseFloat(e.target.value) || 0)} />
              </InputRow>
              <InputRow label="Týdenní hodiny">
                <input type="number" className={inp} value={employee.weeklyHours} onChange={e => onEmployeeChange('weeklyHours', parseFloat(e.target.value) || 0)} />
              </InputRow>
              <InputRow label="Pracovní dny v týdnu">
                <input type="number" className={inp} value={employee.workDaysPerWeek} onChange={e => onEmployeeChange('workDaysPerWeek', parseFloat(e.target.value) || 0)} />
              </InputRow>
              <InputRow label="Víkendový provoz">
                <input type="checkbox" checked={employee.weekendWorking} onChange={e => onEmployeeChange('weekendWorking', e.target.checked)} />
              </InputRow>
            </div>
          </div>
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">Mzdové údaje</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <InputRow label="Základní mzda">
                <input type="number" className={inp} value={employee.baseSalary} onChange={e => onEmployeeChange('baseSalary', parseFloat(e.target.value) || 0)} />
              </InputRow>
              <InputRow label="Osobní ohodnocení %">
                <input type="number" className={inp} value={Math.round(employee.personalBonus * 100)} onChange={e => onEmployeeChange('personalBonus', (parseFloat(e.target.value) || 0) / 100)} />
              </InputRow>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">Daň a pojištění</div>
            <div className="grid gap-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={employee.appliesHealthMinimumBase} onChange={e => onEmployeeChange('appliesHealthMinimumBase', e.target.checked)} />
                <span>Uplatnit minimální základ ZP</span>
              </label>
              {!employee.appliesHealthMinimumBase && (
                <InputRow label="Důvod výjimky">
                  <input className={inp} value={employee.healthMinimumBaseExceptionReason || ''} onChange={e => onEmployeeChange('healthMinimumBaseExceptionReason', e.target.value)} />
                </InputRow>
              )}
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={employee.taxDeclarationSigned} onChange={e => onEmployeeChange('taxDeclarationSigned', e.target.checked)} />
                <span>Podepsané prohlášení poplatníka</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={employee.taxpayerCreditApplied} disabled={!employee.taxDeclarationSigned} onChange={e => onEmployeeChange('taxpayerCreditApplied', e.target.checked)} />
                <span>Uplatnit slevu na poplatníka</span>
              </label>
            </div>
          </div>
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">Dovolená</div>
            <div className="grid gap-3 sm:grid-cols-3">
              <InputRow label="Roční nárok">
                <input type="number" className={inp} value={employee.vacationEntitlementHours} onChange={e => onEmployeeChange('vacationEntitlementHours', parseFloat(e.target.value) || 0)} />
              </InputRow>
              <InputRow label="Vyčerpáno">
                <input type="number" className={inp} value={employee.vacationUsedHours} onChange={e => onEmployeeChange('vacationUsedHours', parseFloat(e.target.value) || 0)} />
              </InputRow>
              <InputRow label="Zůstatek">
                <input type="number" className={inp} value={employee.vacationRemainingHours} onChange={e => onEmployeeChange('vacationRemainingHours', parseFloat(e.target.value) || 0)} />
              </InputRow>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button className="border border-slate-300 px-3 py-1 text-[12px] text-slate-700" onClick={onSaveEmployee}>Uložit zaměstnance</button>
        {info && <span className="text-green-700">{info}</span>}
        {error && <span className="text-red-700">{error}</span>}
      </div>
    </section>
  )
}
