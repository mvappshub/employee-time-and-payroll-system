import { FileText, UserPlus } from 'lucide-react'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import {
  ShiftOperationTypeLabels,
  type EmployeeSettings,
  type EmploymentContractDocument,
  type ShiftOperationType,
} from '../../domain/shared/types'
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

function statusLabel(value: string) {
  if (value === 'ready') return 'Připraveno'
  if (value === 'issued') return 'Vystaveno'
  if (value === 'invalidated') return 'Zneplatněno'
  return 'Rozpracováno'
}

export function EmployeeDetail({
  employee,
  error,
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
    return <EmptyState icon={<UserPlus />} title="Vyberte zaměstnance" description="Vyberte kartu ze seznamu nebo založte novou." />
  }

  return (
    <div className="space-y-3">
      {error && <Alert tone="danger">{error}</Alert>}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Identita</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Jméno" value={employee.name} onChange={e => onEmployeeChange('name', e.target.value)} />
              <Input label="Osobní číslo" value={employee.employeeNumber} onChange={e => onEmployeeChange('employeeNumber', e.target.value)} />
              <Input label="Datum nástupu" type="date" value={employee.employmentStartDate} onChange={e => onEmployeeChange('employmentStartDate', e.target.value)} />
              <Input label="Základní mzda" type="number" value={employee.baseSalary} onChange={e => onEmployeeChange('baseSalary', parseFloat(e.target.value) || 0)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Smlouva</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Adresa bydliště" value={employee.permanentAddress} onChange={e => onEmployeeChange('permanentAddress', e.target.value)} />
              <Input label="Druh práce" value={employee.contractJobTitle} onChange={e => onEmployeeChange('contractJobTitle', e.target.value)} />
              <Input label="Místo výkonu práce" value={employee.contractWorkplace} onChange={e => onEmployeeChange('contractWorkplace', e.target.value)} />
              <Input label="Pracovní doba / úvazek" value={employee.contractWorkSchedule} onChange={e => onEmployeeChange('contractWorkSchedule', e.target.value)} />
              <Input label="Datum ukončení" type="date" value={employee.employmentEndDate || ''} onChange={e => onEmployeeChange('employmentEndDate', e.target.value)} />
              <Input label="Doba určitá do" type="date" value={employee.fixedTermEndDate || ''} onChange={e => onEmployeeChange('fixedTermEndDate', e.target.value)} />
              <Input label="Úvazek" type="number" step="0.1" value={employee.workload} onChange={e => onEmployeeChange('workload', parseFloat(e.target.value) || 0)} />
              <Select label="Směnný provoz" value={employee.shiftOperation} onChange={e => onEmployeeChange('shiftOperation', e.target.value)}>
                {(Object.entries(ShiftOperationTypeLabels) as Array<[ShiftOperationType, string]>).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
              <Input label="Týdenní hodiny" type="number" value={employee.weeklyHours} readOnly />
              <Input label="Zkušební doba (měsíce)" type="number" value={employee.probationMonths || 0} onChange={e => onEmployeeChange('probationMonths', parseFloat(e.target.value) || 0)} />
              <Input label="Osobní ohodnocení %" type="number" value={Math.round(employee.personalBonus * 100)} onChange={e => onEmployeeChange('personalBonus', (parseFloat(e.target.value) || 0) / 100)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Daň a dovolená</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={employee.appliesHealthMinimumBase} onChange={e => onEmployeeChange('appliesHealthMinimumBase', e.target.checked)} />
                <span>Uplatnit minimální základ ZP</span>
              </label>
              {!employee.appliesHealthMinimumBase && (
                <Input label="Důvod výjimky" value={employee.healthMinimumBaseExceptionReason || ''} onChange={e => onEmployeeChange('healthMinimumBaseExceptionReason', e.target.value)} />
              )}
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={employee.taxDeclarationSigned} onChange={e => onEmployeeChange('taxDeclarationSigned', e.target.checked)} />
                <span>Podepsané prohlášení poplatníka</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={employee.taxpayerCreditApplied} disabled={!employee.taxDeclarationSigned} onChange={e => onEmployeeChange('taxpayerCreditApplied', e.target.checked)} />
                <span>Uplatnit slevu na poplatníka</span>
              </label>
              <div className="grid grid-cols-3 gap-3 pt-1">
                <Input label="Dovolená - roční nárok (h)" type="number" value={employee.vacationEntitlementHours} onChange={e => onEmployeeChange('vacationEntitlementHours', parseFloat(e.target.value) || 0)} />
                <Input label="Dovolená - vyčerpáno (h)" type="number" value={employee.vacationUsedHours} onChange={e => onEmployeeChange('vacationUsedHours', parseFloat(e.target.value) || 0)} />
                <Input label="Dovolená - zůstatek (h)" type="number" value={employee.vacationRemainingHours} onChange={e => onEmployeeChange('vacationRemainingHours', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader
            actions={contractDocument ? <Badge tone={canPrintContract ? 'success' : 'warning'}>{statusLabel(contractDocument.lifecycleStatus)}</Badge> : <Badge tone="muted">Bez dokumentu</Badge>}
          >
            <CardTitle>Dokumenty zaměstnance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contractMissingFields.length > 0 && (
              <Alert tone="warning" title="Pro tisk pracovní smlouvy doplňte">
                {contractMissingFields.join(', ')}.
              </Alert>
            )}
            {contractDocument && (
              <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                <span>Pracovní smlouva, verze {contractDocument.version}</span>
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
          </CardContent>
          <CardFooter>
            <Button variant="ghost" size="sm" onClick={onToggleContractPreview} disabled={!contractDocument}>
              {showContractPreview ? 'Skrýt náhled' : 'Náhled'}
            </Button>
            <Button variant="secondary" size="sm" onClick={onRefreshContractDraft} disabled={!contractDocument}>
              Aktualizovat dokument
            </Button>
            <Button variant="primary" size="sm" onClick={onPrintContract} disabled={!contractDocument || !canPrintContract}>
              Tisk / PDF
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="sticky bottom-2 z-10 flex items-center justify-end gap-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-md backdrop-blur">
        <Button variant="primary" size="sm" onClick={onSaveEmployee}>Uložit kartu</Button>
      </div>
    </div>
  )
}
