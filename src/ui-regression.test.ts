import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const employeeView = readFileSync(new URL('./screens/employee/EmployeeView.tsx', import.meta.url), 'utf8')
const paySlipView = readFileSync(new URL('./screens/payslip/PaySlipView.tsx', import.meta.url), 'utf8')
const timeSheetView = readFileSync(new URL('./screens/timesheet/TimeSheetView.tsx', import.meta.url), 'utf8')
const holidaysView = readFileSync(new URL('./screens/holidays/HolidaysView.tsx', import.meta.url), 'utf8')
const appShellView = readFileSync(new URL('./screens/app/AppShellView.tsx', import.meta.url), 'utf8')
const paySlipHook = readFileSync(new URL('./application/usePaySlipScreen.ts', import.meta.url), 'utf8')
const appShellHook = readFileSync(new URL('./application/useAppShell.ts', import.meta.url), 'utf8')
const monthControlsView = readFileSync(new URL('./screens/month-controls/MonthControlsView.tsx', import.meta.url), 'utf8')

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
    expect(paySlipView).toContain('Výplatní páska pro zaměstnance')
    expect(paySlipView).toContain('Hrubá mzda')
    expect(paySlipView).toContain('Čistá mzda')
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
    expect(appShellView).toContain('navigationItems.map')
  })
})
