import { useStore } from '../infrastructure/state/store'
import { EmploymentTypeLabels } from '../domain/shared/types'

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
    holidayCompensationOptions: [
      { value: 'time-off', label: 'náhr. volno' },
      { value: 'premium', label: 'příplatek' },
    ],
    overtimeCompensationOptions: [
      { value: 'premium', label: 'příplatek' },
      { value: 'time-off', label: 'náhr. volno' },
    ],
    dailyFundLabel: employee.workDaysPerWeek > 0 ? `${(employee.weeklyHours / employee.workDaysPerWeek).toFixed(2)} h` : '0 h',
    onEmployerChange: (field: keyof typeof employer, value: string) => setEmployer({ [field]: value }),
    onEmployeeChange: (field: keyof typeof employee, value: ValueUpdate) => updateEmployee(employee.id, { [field]: value } as Partial<typeof employee>),
  }
}
