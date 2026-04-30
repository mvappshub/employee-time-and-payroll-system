import type { PaySlipInputs } from '../shared/types'

export const defaultPaySlipInputs: PaySlipInputs = {
  manualReward: 0,
  includeManualRewardInAverage: false,
  unworked: 0,
  sickCarryoverDays: 0,
  holidayCompensationMode: 'time-off',
}
