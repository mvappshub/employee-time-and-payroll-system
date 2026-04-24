import { useStore } from '../infrastructure/state/store'
import { EmploymentTypeLabels } from '../domain/shared/types'

type ValueUpdate = string | number | boolean

export function useEmployeeScreen() {
  const employer = useStore(s => s.employer)
  const setEmployer = useStore(s => s.setEmployer)
  const employee = useStore(s => s.employee)
  const setEmployee = useStore(s => s.setEmployee)

  return {
    employer,
    employee,
    employmentTypeOptions: [
      { value: 'pracovni_pomer', label: EmploymentTypeLabels.pracovni_pomer },
    ],
    remunerationTypeOptions: [
      { value: 'mzda', label: 'mzda' },
      { value: 'plat', label: 'plat' },
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
    onEmployerChange: (field: 'name' | 'ico' | 'seat', value: string) => setEmployer({ [field]: value }),
    onEmployeeChange: (field: string, value: ValueUpdate) => setEmployee({ [field]: value } as never),
  }
}
