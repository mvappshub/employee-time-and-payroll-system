import { validateIco } from './contractFormatters'

export interface EmploymentContractValidationData {
  employerLegalName: string
  employerIco: string
  employerRegisteredAddress: string
  representativeName: string
  representativeRole: string
  employeeName: string
  employeeBirthDate: string
  employeeAddress: string
  jobType: string
  workplace: string
  startDate: string
  contractConclusionDate: string
  signaturePlace: string
  durationType: 'indefinite' | 'fixed_term'
  fixedTermEndDate: string | null
  weeklyHours: number
  isManager: boolean
  probationEnabled: boolean
  probationMonths: number | null
  grossMonthlyWage: number
  annualVacationWeeks: number
}
export interface EmploymentContractValidationResult {
  missingFields: string[]
  errors: string[]
  warnings: string[]
  wageBelowMinimum: boolean
  vacationBelowMinimum: boolean
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function parseDate(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function daysBetween(start: string, end: string): number | null {
  const startDate = parseDate(start)
  const endDate = parseDate(end)
  if (!startDate || !endDate) return null
  return Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / MS_PER_DAY) + 1)
}

export function getMinimumMonthlyWage(year: number, weeklyHours: number): number {
  const monthlyMinimumWage40h = year === 2026 ? 22400 : 22400
  const safeWeeklyHours = Number.isFinite(weeklyHours) && weeklyHours > 0 ? weeklyHours : 40
  return Math.round((monthlyMinimumWage40h * safeWeeklyHours / 40) * 100) / 100
}

export function validateEmploymentContractFields(data: EmploymentContractValidationData): EmploymentContractValidationResult {
  const missingFields: string[] = []
  const errors: string[] = []
  const warnings: string[] = []

  if (!data.employerLegalName.trim()) missingFields.push('název zaměstnavatele')
  if (!data.employerIco.trim()) missingFields.push('IČO zaměstnavatele')
  if (data.employerIco.trim() && !validateIco(data.employerIco)) errors.push('IČO zaměstnavatele nemá platný formát ani kontrolní číslici.')
  if (!data.employerRegisteredAddress.trim()) missingFields.push('sídlo zaměstnavatele')
  if (!data.representativeName.trim()) missingFields.push('jednající osoba zaměstnavatele')
  if (!data.representativeRole.trim()) missingFields.push('funkce jednající osoby')
  if (!data.employeeName.trim()) missingFields.push('jméno a příjmení zaměstnance')
  if (!data.employeeBirthDate.trim()) missingFields.push('datum narození zaměstnance')
  if (!data.employeeAddress.trim()) missingFields.push('bydliště zaměstnance')
  if (!data.jobType.trim()) missingFields.push('druh práce')
  if (!data.workplace.trim()) missingFields.push('místo výkonu práce')
  if (!data.startDate.trim()) missingFields.push('den nástupu')
  if (!data.contractConclusionDate.trim()) missingFields.push('datum podpisu smlouvy')
  if (!data.signaturePlace.trim()) missingFields.push('místo podpisu smlouvy')
  if (data.durationType === 'fixed_term' && !data.fixedTermEndDate) missingFields.push('datum konce doby určité')
  if (!Number.isFinite(data.weeklyHours) || data.weeklyHours <= 0) missingFields.push('týdenní pracovní doba')
  if (!Number.isFinite(data.grossMonthlyWage) || data.grossMonthlyWage <= 0) missingFields.push('hrubá měsíční mzda')

  if (data.probationEnabled) {
    const probationMonths = data.probationMonths || 0
    if (probationMonths <= 0) errors.push('Zkušební doba musí být delší než 0 měsíců.')
    const maxMonths = data.isManager ? 8 : 4
    if (probationMonths > maxMonths) errors.push(`Zkušební doba nesmí přesáhnout ${maxMonths} měsíců.`)
    const startDate = parseDate(data.startDate)
    const conclusionDate = parseDate(data.contractConclusionDate)
    if (startDate && conclusionDate && conclusionDate.getTime() > startDate.getTime()) {
      errors.push('Datum uzavření smlouvy nesmí být po dni nástupu, pokud je sjednána zkušební doba.')
    }
    if (data.durationType === 'fixed_term' && data.fixedTermEndDate) {
      const fixedTermDays = daysBetween(data.startDate, data.fixedTermEndDate)
      if (fixedTermDays !== null && probationMonths * 30.5 > fixedTermDays / 2) {
        errors.push('Zkušební doba u doby určité nesmí přesáhnout polovinu sjednané doby trvání.')
      }
    }
  }

  const year = Number(data.startDate.slice(0, 4)) || 2026
  const minimumWage = getMinimumMonthlyWage(year, data.weeklyHours)
  const wageBelowMinimum = data.grossMonthlyWage > 0 && data.grossMonthlyWage < minimumWage
  if (wageBelowMinimum) warnings.push(`Mzda je pod poměrnou minimální mzdou ${minimumWage.toLocaleString('cs-CZ')} Kč.`)

  const vacationBelowMinimum = data.annualVacationWeeks < 4
  if (vacationBelowMinimum) errors.push('Dovolená nesmí být nižší než 4 týdny za kalendářní rok.')

  return { missingFields, errors, warnings, wageBelowMinimum, vacationBelowMinimum }
}
