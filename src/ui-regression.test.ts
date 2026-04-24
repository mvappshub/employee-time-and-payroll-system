import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('UI regressions', () => {
  it('employee form no longer exposes manual PHV or PV fields', () => {
    const source = readFileSync(new URL('./Employee.tsx', import.meta.url), 'utf8')

    expect(source).not.toContain('Hrubá mzda pro PHV (čtvrtletí)')
    expect(source).not.toContain('Odprac. hodiny pro PHV')
    expect(source).not.toContain('Odprac. dny pro PHV')
    expect(source).not.toContain('Pravděpodobný výdělek')
  })

  it('employee form no longer exposes pseudo-input fund toggles', () => {
    const source = readFileSync(new URL('./Employee.tsx', import.meta.url), 'utf8')

    expect(source).not.toContain('Svátek uznat jako fond')
    expect(source).not.toContain('Dovolenou uznat jako fond')
    expect(source).not.toContain('Nemoc uznat jako fond')
  })

  it('payslip no longer exposes the hourly rate row', () => {
    const source = readFileSync(new URL('./PaySlip.tsx', import.meta.url), 'utf8')

    expect(source).not.toContain('Hodinová sazba')
  })

  it('employee form exposes employment start date', () => {
    const source = readFileSync(new URL('./Employee.tsx', import.meta.url), 'utf8')

    expect(source).toContain('Datum nástupu')
    expect(source).toContain("type=\"date\"")
    expect(source).not.toContain("{time('employmentStartDate', 'Datum nástupu')}")
  })

  it('payslip exposes the readonly average earnings audit block', () => {
    const source = readFileSync(new URL('./PaySlip.tsx', import.meta.url), 'utf8')

    expect(source).toContain('Zdroj výdělku pro náhrady')
    expect(source).toContain('Rozhodné období')
    expect(source).toContain('Zdrojové měsíce')
    expect(source).toContain('Gross for average')
    expect(source).toContain('Worked hours for average')
    expect(source).toContain('Worked days for average')
  })

  it('payslip wording distinguishes probable earnings from actual PHV', () => {
    const source = readFileSync(new URL('./PaySlip.tsx', import.meta.url), 'utf8')

    expect(source).toContain("    ? 'Skutečný PHV'")
    expect(source).toContain("      ? 'Pravděpodobný výdělek'")
    expect(source).toContain('employeeContextMonth')
  })
})
