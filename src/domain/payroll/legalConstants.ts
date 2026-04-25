export interface LegalConstant {
  key: string
  value: number
  validFrom: string
  validTo?: string
  source: string
}

const LEGAL_CONSTANTS: LegalConstant[] = [
  { key: 'sickPayReductionLimitFirst', value: 1633, validFrom: '2026-01', source: '2026 statutory reduction limit' },
  { key: 'sickPayReductionLimitSecond', value: 2449, validFrom: '2026-01', source: '2026 statutory reduction limit' },
  { key: 'sickPayReductionLimitThird', value: 4897, validFrom: '2026-01', source: '2026 statutory reduction limit' },
  { key: 'taxThreshold', value: 146_901, validFrom: '2026-01', source: '2026 monthly tax threshold' },
  { key: 'taxpayerCredit', value: 2570, validFrom: '2026-01', source: '2026 taxpayer monthly credit' },
  { key: 'minimumWage', value: 20_800, validFrom: '2026-01', source: '2026 minimum wage' },
  { key: 'healthEmployeeRate', value: 0.045, validFrom: '2026-01', source: '2026 health insurance rate' },
  { key: 'healthEmployerRate', value: 0.09, validFrom: '2026-01', source: '2026 health insurance rate' },
  { key: 'socialEmployeeRate', value: 0.071, validFrom: '2026-01', source: '2026 social insurance rate' },
  { key: 'socialEmployerRate', value: 0.248, validFrom: '2026-01', source: '2026 social insurance rate' },
]

const SNAPSHOT_KEYS = [
  'sickPayReductionLimitFirst',
  'sickPayReductionLimitSecond',
  'sickPayReductionLimitThird',
  'taxThreshold',
  'taxpayerCredit',
  'minimumWage',
  'healthEmployeeRate',
  'healthEmployerRate',
  'socialEmployeeRate',
  'socialEmployerRate',
] as const

export function getConstantForMonth(key: string, month: string): number {
  const match = LEGAL_CONSTANTS.find(constant => {
    const starts = constant.validFrom <= month
    const ends = !constant.validTo || constant.validTo >= month
    return constant.key === key && starts && ends
  })

  if (!match) {
    throw new Error(`Chybí zákonná konstanta ${key} pro měsíc ${month}.`)
  }

  return match.value
}

export function getLegalConstantsSnapshot(month: string): Record<string, number> {
  return Object.fromEntries(SNAPSHOT_KEYS.map(key => [key, getConstantForMonth(key, month)]))
}
