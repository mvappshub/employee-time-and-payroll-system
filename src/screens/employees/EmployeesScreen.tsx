import { useEffect, useState } from 'react'
import { useMonthControls } from '../../application/useMonthControls'
import { usePaySlipScreen } from '../../application/usePaySlipScreen'
import { useTimeSheetScreen } from '../../application/useTimeSheetScreen'
import { useStore } from '../../infrastructure/state/store'
import { IssuedPayslipDocumentView } from '../documents/IssuedPayslipDocumentView'
import { TimeSheetStatementDocumentView } from '../documents/TimeSheetStatementDocumentView'
import { EmployeeDetail } from './EmployeeDetail'
import { EmployeeList } from './EmployeeList'
import { EmployeeMonthOverview } from './EmployeeMonthOverview'
import { useEmployeesScreen } from '../../application/useEmployeesScreen'
import { TimeSheetView } from '../timesheet/TimeSheetView'

type WorkspaceTab = 'profile' | 'timesheet' | 'payroll' | 'documents'
type DocumentSelection = 'contract' | 'timesheet' | 'payslip'

const tabs: Array<{ key: WorkspaceTab; label: string }> = [
  { key: 'profile', label: 'Karta (Profil)' },
  { key: 'timesheet', label: 'Evidence a Docházka' },
  { key: 'payroll', label: 'Mzdy (Přehled měsíců)' },
  { key: 'documents', label: 'Dokumenty & Smlouvy' },
]

export function EmployeesScreen() {
  const screen = useEmployeesScreen()
  const monthControls = useMonthControls()
  const timeSheet = useTimeSheetScreen()
  const paySlip = usePaySlipScreen()
  const selectedEmployeeId = useStore(s => s.selectedEmployeeId)
  const selectEmployee = useStore(s => s.selectEmployee)

  const [detailOpen, setDetailOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('profile')
  const [selectedDocument, setSelectedDocument] = useState<DocumentSelection>('contract')
  const [toast, setToast] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (screen.selectedEmployee) {
      setDetailOpen(true)
    }
  }, [screen.selectedEmployee])

  useEffect(() => {
    const nextToast =
      screen.error ? { type: 'error' as const, message: screen.error } :
      monthControls.error ? { type: 'error' as const, message: monthControls.error } :
      timeSheet.error ? { type: 'error' as const, message: timeSheet.error } :
      paySlip.error ? { type: 'error' as const, message: paySlip.error } :
      screen.info ? { type: 'success' as const, message: screen.info } :
      monthControls.success ? { type: 'success' as const, message: monthControls.success } :
      monthControls.info ? { type: 'info' as const, message: monthControls.info } :
      timeSheet.info ? { type: 'info' as const, message: timeSheet.info } :
      paySlip.info ? { type: 'info' as const, message: paySlip.info } :
      null

    if (!nextToast) return
    setToast(nextToast)
    const timeout = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timeout)
  }, [
    monthControls.error,
    monthControls.info,
    monthControls.success,
    paySlip.error,
    paySlip.info,
    screen.error,
    screen.info,
    timeSheet.error,
    timeSheet.info,
  ])

  const selectedEmployeeStatus = screen.selectedEmployee?.status === 'active' ? 'Aktivní' : 'Archivovaný'
  const availableDocuments = [
    screen.employmentContractDocument ? { key: 'contract' as const, label: 'Pracovní smlouva', status: screen.employmentContractDocument.lifecycleStatus, available: true } : null,
    timeSheet.timeSheetDocument ? { key: 'timesheet' as const, label: `Výpis evidence · ${timeSheet.monthLabel}`, status: timeSheet.timeSheetDocument.lifecycleStatus, available: true } : null,
    paySlip.issuedPayslipDocument ? { key: 'payslip' as const, label: `Výplatní páska · ${paySlip.monthLabel}`, status: paySlip.issuedPayslipDocument.lifecycleStatus, available: true } : null,
  ].filter(Boolean) as Array<{ key: DocumentSelection; label: string; status: string; available: true }>

  useEffect(() => {
    if (availableDocuments.some(item => item.key === selectedDocument)) return
    if (availableDocuments[0]) {
      setSelectedDocument(availableDocuments[0].key)
    }
  }, [availableDocuments, selectedDocument])

  const openEmployee = (employeeId: string) => {
    screen.onSelectEmployee(employeeId)
    setDetailOpen(true)
    setActiveTab('profile')
  }

  const createEmployee = () => {
    screen.onCreateEmployee()
    setDetailOpen(true)
    setActiveTab('profile')
  }

  const backToList = () => {
    selectEmployee(null)
    setDetailOpen(false)
    setActiveTab('profile')
  }

  const docsToolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className="border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
        onClick={() => {
          if (selectedDocument === 'contract') {
            screen.onRefreshContractDraft()
            return
          }
          if (selectedDocument === 'timesheet') {
            timeSheet.onPrintDocument()
            return
          }
          if (selectedDocument === 'payslip') {
            monthControls.onIssuePayslip()
          }
        }}
        disabled={
          (selectedDocument === 'contract' && !screen.employmentContractDocument) ||
          (selectedDocument === 'timesheet' && !timeSheet.timeSheetDocument) ||
          (selectedDocument === 'payslip' && !monthControls.buttonState.canIssuePayslip)
        }
        title="Obnoví nebo vystaví dokument podle aktuálního výběru."
      >
        Vygenerovat dokument
      </button>
      <button
        className="border border-blue-600 bg-blue-600 px-3 py-2 text-[12px] font-semibold text-white disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
        onClick={() => {
          if (selectedDocument === 'contract') {
            screen.onPrintContract()
            return
          }
          if (selectedDocument === 'timesheet') {
            timeSheet.onPrintDocument()
            return
          }
          monthControls.onPrintPayslip()
        }}
        disabled={
          (selectedDocument === 'contract' && !screen.canPrintContract) ||
          (selectedDocument === 'timesheet' && !timeSheet.canPreviewDocument) ||
          (selectedDocument === 'payslip' && !monthControls.buttonState.canPrint)
        }
      >
        Tisk / Uložit PDF
      </button>
      <span className="cursor-help text-xs text-slate-400" title="Akce se vztahují k právě vybranému dokumentu.">[?]</span>
    </div>
  )

  const toolbar = {
    profile: (
      <button className="border border-blue-600 bg-blue-600 px-3 py-2 text-[12px] font-semibold text-white" onClick={screen.onSaveEmployee}>
        Uložit osobní kartu
      </button>
    ),
    timesheet: (
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={timeSheet.month}
          onChange={e => timeSheet.onMonthChange(e.target.value)}
          className="min-h-8 rounded-md border border-slate-300 bg-white px-3 py-2 text-[12px] text-slate-700"
        >
          {screen.monthRows.map(row => (
            <option key={row.month} value={row.month}>{row.monthLabel}</option>
          ))}
        </select>
        <button className="border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400" onClick={monthControls.onLoad} disabled={!monthControls.buttonState.canLoad}>
          Načíst docházku
        </button>
        <button className="border border-blue-600 bg-blue-600 px-3 py-2 text-[12px] font-semibold text-white disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400" onClick={monthControls.onSave} disabled={!monthControls.buttonState.canSave}>
          Uložit evidenci
        </button>
        <button className="border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400" onClick={monthControls.onCloseMonth} disabled={!monthControls.buttonState.canClose}>
          Uzavřít evidenci
        </button>
      </div>
    ),
    payroll: (
      <div className="flex flex-wrap items-center gap-2">
        <button className="border border-blue-600 bg-blue-600 px-3 py-2 text-[12px] font-semibold text-white disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400" onClick={monthControls.onCalculatePayroll} disabled={!monthControls.buttonState.canCalculatePayroll}>
          Spočítat mzdu
        </button>
        <button className="border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400" onClick={monthControls.onApproveMonth} disabled={!monthControls.buttonState.canApprove}>
          Schválit mzdu
        </button>
        <button className="border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400" onClick={monthControls.onArchiveMonth} disabled={!monthControls.monthExists}>
          Archivovat měsíc
        </button>
      </div>
    ),
    documents: docsToolbar,
  }

  if (!detailOpen) {
    return (
      <div className="space-y-6">
        <EmployeeList
          employees={screen.employees}
          selectedEmployeeId={selectedEmployeeId}
          onSelectEmployee={openEmployee}
          onCreateEmployee={createEmployee}
          onArchiveEmployee={screen.onArchiveEmployee}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed right-6 top-6 z-40 rounded-lg border px-4 py-3 text-sm shadow-lg ${
          toast.type === 'error'
            ? 'border-red-200 bg-red-50 text-red-700'
            : toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-white text-slate-600'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="sticky top-0 z-20 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button className="border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-700" onClick={backToList}>
              &lt; Back to List
            </button>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500">Employee:</span>
            <span className="font-semibold text-slate-900">{screen.selectedEmployee?.name || 'Nová karta'}</span>
            <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ${selectedEmployeeStatus === 'Aktivní' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {selectedEmployeeStatus}
            </span>
          </div>
          <div>{toolbar[activeTab]}</div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-b border-slate-200">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-t-lg border border-b-0 px-4 py-2 text-sm font-medium shadow-none ${activeTab === tab.key ? 'border-slate-200 bg-white text-slate-900' : 'border-transparent bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'profile' && (
        <EmployeeDetail
          employee={screen.selectedEmployee}
          error={screen.error}
          info={screen.info}
          contractDocument={screen.employmentContractDocument}
          contractMissingFields={screen.contractMissingFields}
          showContractPreview={screen.showContractPreview}
          canPrintContract={screen.canPrintContract}
          onEmployeeChange={screen.onEmployeeChange}
          onSaveEmployee={screen.onSaveEmployee}
          onToggleContractPreview={screen.onToggleContractPreview}
          onRefreshContractDraft={screen.onRefreshContractDraft}
          onPrintContract={screen.onPrintContract}
        />
      )}

      {activeTab === 'timesheet' && (
        <TimeSheetView
          title={timeSheet.title}
          month={timeSheet.month}
          emptyState={timeSheet.emptyState}
          info={timeSheet.info}
          error={timeSheet.error}
          showDocumentPreview={timeSheet.showDocumentPreview}
          timeSheetDocument={timeSheet.timeSheetDocument}
          canPreviewDocument={timeSheet.canPreviewDocument}
          documentBlockedReason={timeSheet.documentBlockedReason}
          shiftOptions={timeSheet.shiftOptions}
          summary={timeSheet.summary}
          rows={timeSheet.rows}
          onMonthChange={timeSheet.onMonthChange}
          onResetMonth={timeSheet.onResetMonth}
          onToggleDocumentPreview={timeSheet.onToggleDocumentPreview}
          onPrintDocument={timeSheet.onPrintDocument}
          onShiftChange={timeSheet.onShiftChange}
          onArrivalChange={timeSheet.onArrivalChange}
          onDepartureChange={timeSheet.onDepartureChange}
        />
      )}

      {activeTab === 'payroll' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            Mzdy a workflow měsíců pro vybraného zaměstnance.
          </div>
          <EmployeeMonthOverview
            rows={screen.monthRows}
            onInitMonth={screen.onInitMonth}
            onOpenMonth={screen.onOpenMonth}
            onOpenTimeSheetDocument={screen.onOpenTimeSheetDocument}
          />
          {(monthControls.error || monthControls.info || monthControls.success) && (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              {monthControls.success && <div className="text-emerald-700">{monthControls.success}</div>}
              {monthControls.info && <div className="text-slate-600">{monthControls.info}</div>}
              {monthControls.error && <div className="text-red-700">{monthControls.error}</div>}
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="space-y-2">
              {availableDocuments.map(document => (
                <button
                  key={document.key}
                  onClick={() => setSelectedDocument(document.key)}
                  className={`block w-full rounded-lg border px-3 py-3 text-left shadow-none ${selectedDocument === document.key ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                >
                  <div className="text-sm font-medium">{document.label}</div>
                  <div className="mt-1 text-xs text-slate-500">{document.status}</div>
                </button>
              ))}
              {availableDocuments.length === 0 && (
                <div className="brutal-empty rounded-lg">
                  <div className="text-center text-sm text-slate-600">Zatím nejsou k dispozici žádné dokumenty.</div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {selectedDocument === 'contract' && screen.employmentContractDocument && (
              <EmployeeDetail
                employee={screen.selectedEmployee}
                error=""
                info=""
                contractDocument={screen.employmentContractDocument}
                contractMissingFields={screen.contractMissingFields}
                showContractPreview
                canPrintContract={screen.canPrintContract}
                onEmployeeChange={screen.onEmployeeChange}
                onSaveEmployee={screen.onSaveEmployee}
                onToggleContractPreview={screen.onToggleContractPreview}
                onRefreshContractDraft={screen.onRefreshContractDraft}
                onPrintContract={screen.onPrintContract}
              />
            )}

            {selectedDocument === 'timesheet' && timeSheet.timeSheetDocument && (
              <TimeSheetStatementDocumentView document={timeSheet.timeSheetDocument} />
            )}

            {selectedDocument === 'payslip' && paySlip.issuedPayslipDocument && paySlip.issuedDocumentRows && (
              <IssuedPayslipDocumentView
                document={paySlip.issuedPayslipDocument}
                earningsRows={paySlip.issuedDocumentRows.earningsRows}
                contributionRows={paySlip.issuedDocumentRows.contributionRows}
                taxRows={paySlip.issuedDocumentRows.taxRows}
                recapRows={paySlip.issuedDocumentRows.recapRows}
                grossWage={paySlip.issuedDocumentRows.grossWage}
                netWage={paySlip.issuedDocumentRows.netWage}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
