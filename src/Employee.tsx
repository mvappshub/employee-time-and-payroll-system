/** @deprecated Use screens/employees/EmployeesMainScreen through app composition. */
import { useEmployeeScreen } from './application/useEmployeeScreen'
import { EmployeeView } from './screens/employee/EmployeeView'

export default function Employee() {
  const screen = useEmployeeScreen()

  return (
    <EmployeeView
      employer={screen.employer}
      employee={screen.employee}
      dailyFundLabel={screen.dailyFundLabel}
      employmentTypeOptions={screen.employmentTypeOptions}
      shiftOperationOptions={screen.shiftOperationOptions}
      holidayCompensationOptions={screen.holidayCompensationOptions}
      overtimeCompensationOptions={screen.overtimeCompensationOptions}
      onEmployerChange={screen.onEmployerChange}
      onEmployeeChange={screen.onEmployeeChange}
    />
  )
}
