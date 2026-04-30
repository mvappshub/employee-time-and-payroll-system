import { Check, Printer } from 'lucide-react'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/Card'
import type { MonthStatus } from '../../domain/shared/types'
import { canApproveAndIssue, canCloseAndCalculate, canPrintPayslip } from '../../domain/monthWorkflow'
import { cn } from '../../utils/cn'

export interface MonthControlsViewProps {
  error: string
  info: string
  success: string
  currentStatus: MonthStatus
  currentStatusLabel: string
  selectedEmployeeName: string
  monthLabel: string
  nextStepLabel: string
  lastActionLabel: string
  buttonState: {
    canLoad: boolean
    canInitMonth: boolean
    canCloseAndCalculate: boolean
    canApproveAndIssue: boolean
    canRequestArchive: boolean
    canPrint: boolean
  }
  onLoad: () => void | Promise<void>
  onInitMonth: () => void | Promise<void>
  onCloseAndCalculate: () => void | Promise<void>
  onApproveAndIssue: () => void | Promise<void>
  onRequestArchive: () => void
  onPrintPayslip: () => void | Promise<void>
}

export function MonthControlsView({
  error,
  info,
  success,
  currentStatus,
  currentStatusLabel,
  selectedEmployeeName,
  monthLabel,
  nextStepLabel,
  lastActionLabel,
  buttonState,
  onLoad,
  onInitMonth,
  onCloseAndCalculate,
  onApproveAndIssue,
  onRequestArchive,
  onPrintPayslip,
}: MonthControlsViewProps) {
  const steps = [
    { label: 'Načíst', done: buttonState.canLoad, active: false },
    { label: 'Evidence', done: buttonState.canCloseAndCalculate, active: canCloseAndCalculate(currentStatus) },
    { label: 'Výpočet', done: buttonState.canApproveAndIssue || canApproveAndIssue(currentStatus), active: canApproveAndIssue(currentStatus) },
    { label: 'Páska', done: buttonState.canPrint || canPrintPayslip(currentStatus), active: canPrintPayslip(currentStatus) },
  ]

  return (
    <>
      <Card className="app-controls">
        <CardHeader>
          <CardTitle>Uzavření měsíce</CardTitle>
          <CardDescription>{selectedEmployeeName} · {monthLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="flex items-center gap-1.5">
            {steps.map((step, i) => (
              <li key={step.label} className="flex items-center gap-1.5">
                <div className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold',
                  step.active && 'bg-blue-600 text-white',
                  step.done && !step.active && 'border border-emerald-300 bg-emerald-100 text-emerald-700',
                  !step.done && !step.active && 'bg-slate-100 text-slate-400',
                )}>
                  {step.done ? <Check className="h-3 w-3" /> : i + 1}
                </div>
                <span className={cn('text-xs', step.active ? 'font-semibold text-slate-900' : 'text-slate-500')}>{step.label}</span>
                {i < steps.length - 1 && <div className="h-px w-6 bg-slate-200" />}
              </li>
            ))}
          </ol>

          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 md:grid-cols-5">
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-slate-500">Stav</dt>
              <dd className="mt-0.5"><Badge tone="info">{currentStatusLabel}</Badge></dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-slate-500">Poslední akce</dt>
              <dd className="mt-0.5 text-xs tabular text-slate-700">{lastActionLabel}</dd>
            </div>
            <div className="md:col-span-3">
              <dt className="text-[10px] uppercase tracking-wide text-slate-500">Další krok</dt>
              <dd className="mt-0.5 text-xs font-medium text-slate-900">{nextStepLabel}</dd>
            </div>
          </dl>
        </CardContent>
        <CardFooter>
          <Button variant="secondary" size="sm" onClick={onLoad} disabled={!buttonState.canLoad}>Načíst</Button>
          <Button variant="secondary" size="sm" onClick={onInitMonth} disabled={!buttonState.canInitMonth}>Založit</Button>
          <Button variant="primary" size="sm" onClick={onCloseAndCalculate} disabled={!buttonState.canCloseAndCalculate}>Uzavřít a spočítat</Button>
          <Button variant="primary" size="sm" onClick={onApproveAndIssue} disabled={!buttonState.canApproveAndIssue}>Schválit a vystavit</Button>
          <Button variant="ghost" size="sm" onClick={onRequestArchive} disabled={!buttonState.canRequestArchive}>Zrušit uzávěrku</Button>
          <Button variant="secondary" size="sm" onClick={onPrintPayslip} disabled={!buttonState.canPrint} leftIcon={<Printer className="h-3 w-3" />}>Tisk / PDF</Button>
        </CardFooter>
      </Card>
      {success && <Alert tone="success" className="mt-2">{success}</Alert>}
      {info && <Alert tone="info" className="mt-2">{info}</Alert>}
      {error && <Alert tone="danger" className="mt-2">{error}</Alert>}
    </>
  )
}
