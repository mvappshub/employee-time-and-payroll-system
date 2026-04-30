import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const employeeView = readFileSync(new URL('./screens/employee/EmployeeView.tsx', import.meta.url), 'utf8')
const paySlipView = readFileSync(new URL('./screens/payslip/PaySlipView.tsx', import.meta.url), 'utf8')
const minimalPayslipDocumentView = readFileSync(new URL('./screens/documents/IssuedPayslipMinimalDocumentView.tsx', import.meta.url), 'utf8')
const timeSheetView = readFileSync(new URL('./screens/timesheet/TimeSheetView.tsx', import.meta.url), 'utf8')
const holidaysView = readFileSync(new URL('./screens/holidays/HolidaysView.tsx', import.meta.url), 'utf8')
const appShellView = readFileSync(new URL('./screens/app/AppShellView.tsx', import.meta.url), 'utf8')
const paySlipHook = readFileSync(new URL('./application/usePaySlipScreen.ts', import.meta.url), 'utf8')
const appShellHook = readFileSync(new URL('./application/useAppShell.ts', import.meta.url), 'utf8')
const monthControlsView = readFileSync(new URL('./screens/month-controls/MonthControlsView.tsx', import.meta.url), 'utf8')
const employeesMainScreen = readFileSync(new URL('./screens/employees/EmployeesMainScreen.tsx', import.meta.url), 'utf8')
const timeTrackingMainScreen = readFileSync(new URL('./screens/timesheet/TimeTrackingMainScreen.tsx', import.meta.url), 'utf8')
const payrollMainScreen = readFileSync(new URL('./screens/payroll/PayrollMainScreen.tsx', import.meta.url), 'utf8')
const employeeMonthOverview = readFileSync(new URL('./screens/employees/EmployeeMonthOverview.tsx', import.meta.url), 'utf8')
const employeesHook = readFileSync(new URL('./application/useEmployeesScreen.ts', import.meta.url), 'utf8')
const timeSheetHook = readFileSync(new URL('./application/useTimeSheetScreen.ts', import.meta.url), 'utf8')
const autosaveMonth = readFileSync(new URL('./application/autosaveMonth.ts', import.meta.url), 'utf8')
const monthWorkflow = readFileSync(new URL('./domain/monthWorkflow.ts', import.meta.url), 'utf8')

describe('UI regressions', () => {
  it('employee view exposes employer profile, employee number, and vacation summary inputs', () => {
    expect(employeeView).toContain('Název zaměstnavatele')
    expect(employeeView).toContain('IČO')
    expect(employeeView).toContain('Sídlo')
    expect(employeeView).toContain('Osobní číslo')
    expect(employeeView).toContain('Dovolená - roční nárok (h)')
    expect(employeeView).toContain('Dovolená - vyčerpáno (h)')
    expect(employeeView).toContain('Dovolená - zůstatek (h)')
  })

  it('employee view keeps employment start date input and no PHV fields', () => {
    expect(employeeView).toContain('Datum nástupu')
    expect(employeeView).toContain('type="date"')
    expect(employeeView).not.toContain('Hrubá mzda pro PHV (čtvrtletí)')
    expect(employeeView).not.toContain('Odprac. hodiny pro PHV')
    expect(employeeView).not.toContain('Odprac. dny pro PHV')
  })

  it('payslip view separates internal payroll inputs from the employee-facing document', () => {
    expect(paySlipView).toContain('Interní mzdové vstupy')
    expect(paySlipView).toContain('Ruční odměna')
    expect(paySlipView).toContain('Práce ve svátek')
    expect(paySlipView).not.toContain('auditRows.map')
    expect(paySlipView).not.toContain('Neplacené volno / absence (h)')
    expect(paySlipView).not.toContain('DPN dny z min. měsíce')
    expect(paySlipView).not.toContain('Započítat do PHV')
    expect(paySlipView).toContain('Výpočet mzdy')
    expect(paySlipView).toContain('2xl:grid-cols-3')
    expect(paySlipView).toContain('Výplatní páska pro zaměstnance')
    expect(paySlipView).toContain('Typ výplatní pásky')
    expect(paySlipView).toContain('Plná')
    expect(paySlipView).toContain('Minimální')
    expect(paySlipView).toContain('Náhled')
    expect(paySlipView).toContain('Skrýt náhled')
    expect(paySlipView).toContain('issued-payslip-minimal-document')
    expect(paySlipView).toContain('Hrubá mzda')
    expect(paySlipView).toContain('Čistá mzda')
    expect(paySlipHook).toContain('currentCalculationRows')
    expect(paySlipHook).toContain('effectiveEmployee')
    expect(paySlipHook).toContain('holidayCompensationMode')
    expect(paySlipHook).toContain('showHolidayCompensationMode')
    expect(paySlipHook).toContain('Smlouva')
    expect(paySlipHook).toContain('Docházka')
    expect(paySlipHook).toContain('PHV a vstupy')
    expect(paySlipHook).toContain('Složky hrubé mzdy')
    expect(paySlipHook).toContain('Odvody a daň')
    expect(paySlipHook).toContain('Výsledek')
    expect(paySlipHook).toContain('monthlyFundHours')
    expect(paySlipHook).toContain('healthContributionBase')
    expect(paySlipHook).toContain('taxBeforeCredits')
    expect(paySlipHook).toContain('Typ podkladu pro náhrady')
    expect(paySlipHook).toContain('Rozhodné období')
    expect(paySlipHook).toContain('Zdrojové měsíce')
  })

  it('payslip view contains no technical english labels', () => {
    expect(paySlipView).not.toContain('Employee snapshot')
    expect(paySlipView).not.toContain('Gross for average')
    expect(paySlipView).not.toContain('Worked hours for average')
    expect(paySlipView).not.toContain('Worked days for average')
  })

  it('payslip view keeps employer contributions and vacation recap in the employee output', () => {
    expect(paySlipHook).toContain('ZP zaměstnavatel (9%)')
    expect(paySlipHook).toContain('SP zaměstnavatel (24,8%)')
    expect(paySlipHook).toContain('Dovolená - roční nárok')
    expect(paySlipHook).toContain('Dovolená - vyčerpáno')
    expect(paySlipHook).toContain('Dovolená - zůstatek')
  })

  it('month controls wire print button to a concrete action', () => {
    expect(monthControlsView).toContain('onClick={onPrintPayslip}')
    expect(monthControlsView).toContain('Tisk / PDF')
    expect(paySlipView).toContain('onPrintDocument(selectedDocumentId)')
    expect(paySlipView).toContain("full: 'issued-payslip-document'")
    expect(paySlipView).toContain("minimal: 'issued-payslip-minimal-document'")
  })

  it('minimal payslip document keeps required employee-facing sections', () => {
    expect(minimalPayslipDocumentView).toContain('data-print-document="issued-payslip-minimal-document"')
    expect(minimalPayslipDocumentView).toContain('Mzdové složky')
    expect(minimalPayslipDocumentView).toContain('Odvody a záloha na daň')
    expect(minimalPayslipDocumentView).toContain('Částka k výplatě')
  })

  it('time sheet view still renders the expected work evidence columns', () => {
    expect(timeSheetView).toContain('Příchod')
    expect(timeSheetView).toContain('Odchod')
    expect(timeSheetView).toContain('Svátek/pozn.')
    expect(timeSheetView).toContain('Σ celkem')
  })

  it('holidays view still renders add and edit controls', () => {
    expect(holidaysView).toContain('název svátku')
    expect(holidaysView).toContain('Datum')
    expect(holidaysView).toContain('Název')
  })

  it('app shell view keeps navigation labels', () => {
    expect(appShellHook).toContain('Zaměstnanci')
    expect(appShellHook).toContain('Svátky')
    expect(appShellHook).toContain('Firma')
    expect(appShellHook).toContain('Evidence pracovní doby')
    expect(appShellHook).toContain('Mzdy')
    expect(appShellView).toContain('mainItems.map')
    expect(appShellView).toContain('bottomItems.map')
  })

  it('main section tabs are owned by the split screens', () => {
    expect(employeesMainScreen).toContain("type EmployeesTab = 'list' | 'detail'")
    expect(timeTrackingMainScreen).toContain("type TimeTrackingTab = 'overview' | 'detail'")
    expect(payrollMainScreen).toContain("type PayrollTab = 'overview' | 'detail'")
    expect(timeTrackingMainScreen).toContain("activeTab === 'overview' ? 'block' : 'hidden'")
    expect(payrollMainScreen).toContain("activeTab === 'overview' ? 'block' : 'hidden'")
  })

  it('time tracking uses autosave instead of manual load/save actions', () => {
    expect(timeTrackingMainScreen).not.toContain('Načíst docházku')
    expect(timeTrackingMainScreen).not.toContain('Uložit evidenci')
    expect(timeSheetHook).toContain('autosaveEmployeeMonthDraft')
    expect(autosaveMonth).toContain('saveEmployeeMonthApi')
  })

  it('empty attendance months are prefilled automatically without a visible prefill action', () => {
    expect(timeTrackingMainScreen).not.toContain('Předvyplnit')
    expect(timeSheetHook).toContain('prefillEmployeeMonth')
    expect(timeSheetHook).toContain('hasNoRows')
  })

  it('month overview action opens the consolidated payroll flow', () => {
    expect(employeeMonthOverview).toContain('onRunMonthAction')
    expect(employeesHook).toContain('getMonthPrimaryAction')
    expect(monthWorkflow).toContain('Schválit a vystavit výplatní pásku')
    expect(employeesHook).not.toContain('issuePayslipForMonth')
    expect(employeesHook).toContain("setSection('payroll')")
  })

  it('month overview uses formatted status labels instead of raw enum values', () => {
    expect(employeesHook).toContain('formatMonthStatus')
    expect(employeesHook).not.toContain("timeStatus: status || 'bez dat'")
    expect(employeesHook).not.toContain("payrollStatus: status === 'payroll_calculated'")
  })

  it('visible UI copy does not expose workflow enum names', () => {
    const visibleSources = [employeeMonthOverview, monthControlsView, timeSheetView].join('\n')

    expect(visibleSources).not.toContain('time_saved')
    expect(visibleSources).not.toContain('time_closed')
    expect(visibleSources).not.toContain('payroll_calculated')
    expect(visibleSources).not.toContain('payroll_approved')
    expect(visibleSources).not.toContain('payslip_issued')
  })
})
