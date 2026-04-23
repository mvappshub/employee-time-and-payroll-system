import { describe, expect, it } from 'vitest'
import { calculateQuarterlyPhv, getPreviousQuarterMonths } from './phv'

describe('PHV quarter selection', () => {
  it('uses October to December for January to March', () => {
    expect(getPreviousQuarterMonths('2026-01')).toEqual(['2025-10', '2025-11', '2025-12'])
    expect(getPreviousQuarterMonths('2026-03')).toEqual(['2025-10', '2025-11', '2025-12'])
  })

  it('uses the previous calendar quarter for the rest of the year', () => {
    expect(getPreviousQuarterMonths('2026-04')).toEqual(['2026-01', '2026-02', '2026-03'])
    expect(getPreviousQuarterMonths('2026-07')).toEqual(['2026-04', '2026-05', '2026-06'])
    expect(getPreviousQuarterMonths('2026-10')).toEqual(['2026-07', '2026-08', '2026-09'])
  })
})

describe('PHV calculation', () => {
  it('calculates PHV as gross wages divided by worked hours', () => {
    const result = calculateQuarterlyPhv([
      { month: '2026-01', snapshot: { grossWage: 30000, workedHours: 150, totalSaldo: 0, savedAt: '' } },
      { month: '2026-02', snapshot: { grossWage: 32000, workedHours: 160, totalSaldo: 0, savedAt: '' } },
      { month: '2026-03', snapshot: { grossWage: 31000, workedHours: 155, totalSaldo: 0, savedAt: '' } },
    ])

    expect(result.totalGrossWage).toBe(93000)
    expect(result.totalWorkedHours).toBe(465)
    expect(result.phv).toBe(200)
  })

  it('returns null PHV when there are no worked hours', () => {
    const result = calculateQuarterlyPhv([
      { month: '2026-01', snapshot: { grossWage: 30000, workedHours: 0, totalSaldo: 0, savedAt: '' } },
    ])

    expect(result.phv).toBeNull()
  })
})
