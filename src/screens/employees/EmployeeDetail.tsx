import type { ReactNode } from 'react'
import type { EmployeeSettings, EmploymentContractDocument } from '../../domain/shared/types'
import { EmploymentContractDocumentView } from '../documents/EmploymentContractDocumentView'

export interface EmployeeDetailProps {
  employee: EmployeeSettings | null
  error: string
  info: string
  contractDocument: EmploymentContractDocument | null
  contractMissingFields: string[]
  showContractPreview: boolean
  canPrintContract: boolean
  onEmployeeChange: (field: keyof EmployeeSettings, value: string | number | boolean) => void
  onSaveEmployee: () => void
  onToggleContractPreview: () => void
  onRefreshContractDraft: () => void | Promise<void>
  onPrintContract: () => void | Promise<void>
}

const inp = 'min-h-8 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[12px] text-slate-700 outline-none focus:border-blue-500'

function InputRow({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="grid gap-1">
      <span className="mb-[2px] text-[12px] font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
    </label>
  )
}

export function EmployeeDetail({
  employee,
  error,
  info,
  contractDocument,
  contractMissingFields,
  showContractPreview,
  canPrintContract,
  onEmployeeChange,
  onSaveEmployee,
  onToggleContractPreview,
  onRefreshContractDraft,
  onPrintContract,
}: EmployeeDetailProps) {
  if (!employee) {
    return (
      <section className="brutal-empty rounded-lg">
        <div className="text-center">
          <div className="mb-2 font-extrabold text-black">Vyberte zaměstnance nebo založte novou kartu.</div>
        </div>
      </section>
    )
  }

  return (
    <section className="relative rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="mb-4 text-base font-semibold text-slate-900">Karta zaměstnance</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-slate-900">Povinné pro uložení zaměstnance</div>
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
              <InputRow label="Základní mzda">
                <input type="number" className={inp} value={employee.baseSalary} onChange={e => onEmployeeChange('baseSalary', parseFloat(e.target.value) || 0)} />
              </InputRow>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-slate-900">Povinné pro tisk pracovní smlouvy</div>
            <div className="grid gap-3">
              <InputRow label="Adresa bydliště">
                <input className={inp} value={employee.permanentAddress} onChange={e => onEmployeeChange('permanentAddress', e.target.value)} />
              </InputRow>
              <InputRow label="Druh práce">
                <input className={inp} value={employee.contractJobTitle} onChange={e => onEmployeeChange('contractJobTitle', e.target.value)} />
              </InputRow>
              <InputRow label="Místo výkonu práce">
                <input className={inp} value={employee.contractWorkplace} onChange={e => onEmployeeChange('contractWorkplace', e.target.value)} />
              </InputRow>
              <InputRow label="Pracovní doba / úvazek">
                <input className={inp} value={employee.contractWorkSchedule} onChange={e => onEmployeeChange('contractWorkSchedule', e.target.value)} />
              </InputRow>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-slate-900">Doporučené smluvní údaje</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <InputRow label="Datum ukončení">
                <input type="date" className={inp} value={employee.employmentEndDate || ''} onChange={e => onEmployeeChange('employmentEndDate', e.target.value)} />
              </InputRow>
              <InputRow label="Doba určitá do">
                <input type="date" className={inp} value={employee.fixedTermEndDate || ''} onChange={e => onEmployeeChange('fixedTermEndDate', e.target.value)} />
              </InputRow>
              <InputRow label="Úvazek">
                <input type="number" step="0.1" className={inp} value={employee.workload} onChange={e => onEmployeeChange('workload', parseFloat(e.target.value) || 0)} />
              </InputRow>
              <InputRow label="Týdenní hodiny">
                <input type="number" className={inp} value={employee.weeklyHours} onChange={e => onEmployeeChange('weeklyHours', parseFloat(e.target.value) || 0)} />
              </InputRow>
              <InputRow label="Zkušební doba (měsíce)">
                <input type="number" className={inp} value={employee.probationMonths || 0} onChange={e => onEmployeeChange('probationMonths', parseFloat(e.target.value) || 0)} />
              </InputRow>
              <InputRow label="Osobní ohodnocení %">
                <input type="number" className={inp} value={Math.round(employee.personalBonus * 100)} onChange={e => onEmployeeChange('personalBonus', (parseFloat(e.target.value) || 0) / 100)} />
              </InputRow>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-slate-900">Daň a dovolená</div>
            <div className="grid gap-3">
              <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <input type="checkbox" checked={employee.appliesHealthMinimumBase} onChange={e => onEmployeeChange('appliesHealthMinimumBase', e.target.checked)} />
                <span>Uplatnit minimální základ ZP</span>
              </label>
              {!employee.appliesHealthMinimumBase && (
                <InputRow label="Důvod výjimky">
                  <input className={inp} value={employee.healthMinimumBaseExceptionReason || ''} onChange={e => onEmployeeChange('healthMinimumBaseExceptionReason', e.target.value)} />
                </InputRow>
              )}
              <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <input type="checkbox" checked={employee.taxDeclarationSigned} onChange={e => onEmployeeChange('taxDeclarationSigned', e.target.checked)} />
                <span>Podepsané prohlášení poplatníka</span>
              </label>
              <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <input type="checkbox" checked={employee.taxpayerCreditApplied} disabled={!employee.taxDeclarationSigned} onChange={e => onEmployeeChange('taxpayerCreditApplied', e.target.checked)} />
                <span>Uplatnit slevu na poplatníka</span>
              </label>
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
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button className="border border-blue-600 bg-blue-600 px-3 py-2 text-[12px] font-semibold text-white" onClick={onSaveEmployee}>Uložit osobní kartu</button>
      </div>
      {info && <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-600">{info}</div>}
      {error && <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-medium text-red-700">{error}</div>}

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="mb-2 text-base font-semibold text-slate-900">Dokumenty zaměstnance</div>
        <div className="mb-3 text-[12px] text-slate-600">
          Pracovní smlouva se zakládá jako draft při uložení zaměstnance. Tisk je dostupný až po doplnění povinných údajů zaměstnance i firmy.
        </div>
        {contractMissingFields.length > 0 && (
          <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-800">
            Pro tisk pracovní smlouvy doplňte: {contractMissingFields.join(', ')}.
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button className="border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400" onClick={onToggleContractPreview} disabled={!contractDocument}>
            {showContractPreview ? 'Skrýt náhled' : 'Náhled'}
          </button>
          <button className="border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400" onClick={onRefreshContractDraft} disabled={!contractDocument}>
            Aktualizovat draft
          </button>
          <button className="border border-blue-600 bg-blue-600 px-3 py-2 text-[12px] font-semibold text-white disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400" onClick={onPrintContract} disabled={!contractDocument || !canPrintContract}>
            Tisk / PDF
          </button>
        </div>
        {contractDocument && (
          <div className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-600">
            Stav dokumentu: {contractDocument.lifecycleStatus} · verze {contractDocument.version}
          </div>
        )}
        {contractDocument && (
          <div
            className={showContractPreview ? 'mt-4' : 'document-print-only'}
            aria-hidden={showContractPreview ? undefined : 'true'}
          >
            <EmploymentContractDocumentView document={contractDocument} />
          </div>
        )}
      </div>
    </section>
  )
}
