import { useStore } from '../infrastructure/state/store'
import {
  calculateShiftOperationWeeklyHours,
  EmploymentTypeLabels,
  getShiftOperationDailyFund,
  normalizeShiftOperationType,
  ShiftOperationTypeLabels,
} from '../domain/shared/types'

type ValueUpdate = string | number | boolean

export function useEmployeeScreen() {
  const employer = useStore(s => s.employer)
  const setEmployer = useStore(s => s.setEmployer)
  const employee = useStore(s => s.employees[0])
  const updateEmployee = useStore(s => s.updateEmployee)

  if (!employee) {
    throw new Error('Legacy employee screen requires at least one employee in store.')
  }

  return {
    employer,
    employee,
    employmentTypeOptions: [
      { value: 'pracovni_pomer', label: EmploymentTypeLabels.pracovni_pomer },
    ],
    shiftOperationOptions: Object.entries(ShiftOperationTypeLabels).map(([value, label]) => ({ value, label })),
    holidayCompensationOptions: [
      { value: 'time-off', label: 'náhr. volno' },
      { value: 'premium', label: 'příplatek' },
    ],
    overtimeCompensationOptions: [
      { value: 'premium', label: 'příplatek' },
      { value: 'time-off', label: 'náhr. volno' },
    ],
    dailyFundLabel: `${getShiftOperationDailyFund(employee.shiftOperation, employee.workload).toFixed(2)} h`,
    onEmployerChange: (field: keyof typeof employer, value: string) => setEmployer({ [field]: value }),
    onEmployeeChange: (field: keyof typeof employee, value: ValueUpdate) => {
      const patch = { [field]: value } as Partial<typeof employee>
      if (field === 'shiftOperation' || field === 'workload' || field === 'workDaysPerWeek') {
        const shiftOperation = field === 'shiftOperation' ? normalizeShiftOperationType(value) : employee.shiftOperation
        const workload = field === 'workload' && typeof value === 'number' ? value : employee.workload
        const workDaysPerWeek = field === 'workDaysPerWeek' && typeof value === 'number' ? value : employee.workDaysPerWeek
        patch.weeklyHours = calculateShiftOperationWeeklyHours(shiftOperation, workDaysPerWeek, workload)
      }
      updateEmployee(employee.id, patch)
    },
  }
}
