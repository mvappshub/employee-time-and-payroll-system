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
})
