import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const viewPaths = [
  './screens/app/AppShellView.tsx',
  './screens/employee/EmployeeView.tsx',
  './screens/holidays/HolidaysView.tsx',
  './screens/month-controls/MonthControlsView.tsx',
  './screens/payslip/PaySlipView.tsx',
  './screens/timesheet/TimeSheetView.tsx',
] as const

describe('UI architecture boundaries', () => {
  for (const viewPath of viewPaths) {
    it(`${viewPath} stays props-only`, () => {
      const source = readFileSync(new URL(viewPath, import.meta.url), 'utf8')

      expect(source).not.toContain('useStore(')
      expect(source).not.toContain('fetchQuarterlyPhv')
      expect(source).not.toContain('loadSavedMonth')
      expect(source).not.toContain('saveMonthRecord')
      expect(source).not.toContain('calculateMonthDays')
      expect(source).not.toContain('calcMonthlySummary')
      expect(source).not.toContain('calcPaySlip')
    })
  }

  it('containers delegate to hooks and views', () => {
    const paySlipContainer = readFileSync(new URL('./PaySlip.tsx', import.meta.url), 'utf8')
    const timeSheetContainer = readFileSync(new URL('./TimeSheet.tsx', import.meta.url), 'utf8')

    expect(paySlipContainer).toContain('usePaySlipScreen')
    expect(paySlipContainer).toContain('PaySlipView')
    expect(timeSheetContainer).toContain('useTimeSheetScreen')
    expect(timeSheetContainer).toContain('TimeSheetView')
  })

  it('does not route through deprecated root containers', () => {
    const app = readFileSync(new URL('./app/App.tsx', import.meta.url), 'utf8')

    expect(app).not.toContain("from '../MonthControls'")
    expect(app).not.toContain("from '../PaySlip'")
    expect(app).not.toContain("from '../TimeSheet'")
    expect(app).not.toContain("from '../Employee'")
  })

  it('document layout is a paper document, not an app card', () => {
    const documentLayout = readFileSync(new URL('./screens/documents/DocumentLayout.tsx', import.meta.url), 'utf8')
    const sheetClassMatch = documentLayout.match(/className="document-sheet([^"]*)"/)

    expect(sheetClassMatch?.[0]).toBe('className="document-sheet"')
    expect(sheetClassMatch?.[0]).not.toContain('rounded')
    expect(sheetClassMatch?.[0]).not.toContain('shadow')
    expect(sheetClassMatch?.[0]).not.toContain('border-slate')
    expect(sheetClassMatch?.[0]).not.toContain('text-slate')
  })

  it('document views use print-oriented document tables', () => {
    const payslipDocumentView = readFileSync(new URL('./screens/documents/IssuedPayslipDocumentView.tsx', import.meta.url), 'utf8')
    const minimalPayslipDocumentView = readFileSync(new URL('./screens/documents/IssuedPayslipMinimalDocumentView.tsx', import.meta.url), 'utf8')
    const timeSheetDocumentView = readFileSync(new URL('./screens/documents/TimeSheetStatementDocumentView.tsx', import.meta.url), 'utf8')

    expect(payslipDocumentView).toContain('data-print-document="issued-payslip-document"')
    expect(payslipDocumentView).toContain('payslip-table')
    expect(payslipDocumentView).toContain('payslip-recap')
    expect(minimalPayslipDocumentView).toContain('data-print-document="issued-payslip-minimal-document"')
    expect(minimalPayslipDocumentView).toContain('payslip-min-table')
    expect(minimalPayslipDocumentView).toContain('payslip-min-recap')
    expect(timeSheetDocumentView).toContain('document-table document-table--compact')
  })

  it('print CSS isolates only the active document and declares A4 paper', () => {
    const css = readFileSync(new URL('./styles/index.css', import.meta.url), 'utf8')

    expect(css).toContain('@page')
    expect(css).toContain('size: A4')
    expect(css).toContain('[data-print-document][data-print-active="true"]')
    expect(css).toContain('[data-print-document]:not([data-print-active="true"])')
    expect(css).toContain('table-header-group')
  })
})
