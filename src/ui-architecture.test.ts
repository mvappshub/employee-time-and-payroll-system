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
})
