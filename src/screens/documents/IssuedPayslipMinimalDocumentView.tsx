import type { IssuedPayslipDocument } from '../../domain/shared/types'
import { EmploymentTypeLabels } from '../../domain/shared/types'
import { getConstantForMonth } from '../../domain/payroll/legalConstants'

type MoneyRow = { label: string; hrs?: string; days?: string; czk?: string; bold?: boolean; neg?: boolean }
type PayrollSnapshot = Record<string, unknown>

function numberValue(snapshot: PayrollSnapshot, key: string): number {
  const value = snapshot[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString('cs-CZ', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function formatCzk(value: number): string {
  return `${Math.round(value).toLocaleString('cs-CZ')} Kč`
}

function formatSignedCzk(value: number, sign: 'minus' | 'plain' = 'plain'): string {
  return sign === 'minus' ? `-${formatCzk(value)}` : formatCzk(value)
}

function formatDate(value?: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatPeriod(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number)
  if (!year || !monthNumber) return month
  return new Intl.DateTimeFormat('cs-CZ', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, monthNumber - 1, 1))
}

function averageSourceLabel(source?: string): string {
  if (source === 'actual') return 'skutečný'
  if (source === 'probable') return 'pravděpodobný'
  return 'není k dispozici'
}

function rowAmount(row: MoneyRow): string {
  if (!row.czk) return '-'
  return row.neg ? `-${row.czk}` : row.czk
}

function rowBasis(row: MoneyRow, averageHourly: number): string {
  if (row.label.includes('Příplatek') || row.label.includes('Dovolená') || row.label.includes('Náhrada')) {
    return averageHourly ? `${formatNumber(averageHourly)} Kč/h` : 'PHV'
  }
  if (row.hrs || row.days) return 'měsíční fond'
  return '-'
}

export function IssuedPayslipMinimalDocumentView({
  document,
  earningsRows,
  grossWage,
  netWage,
}: {
  document: IssuedPayslipDocument
  earningsRows: MoneyRow[]
  contributionRows: MoneyRow[]
  taxRows: MoneyRow[]
  recapRows: MoneyRow[]
  grossWage: string
  netWage: string
}) {
  const { employer, employee, month, calculationSnapshot, documentSummary, timeSummary } = document.snapshot
  const payroll = document.snapshot.payrollResult as PayrollSnapshot
  const socialEmployeeRate = getConstantForMonth('socialEmployeeRate', month)
  const healthEmployeeRate = getConstantForMonth('healthEmployeeRate', month)
  const taxpayerCredit = getConstantForMonth('taxpayerCredit', month)
  const socialEmployee = numberValue(payroll, 'socialEmployee')
  const healthEmployee = numberValue(payroll, 'healthEmployee')
  const socialEmployer = numberValue(payroll, 'socialEmployer')
  const healthEmployer = numberValue(payroll, 'healthEmployer')
  const taxBase = numberValue(payroll, 'taxBase')
  const taxBeforeCredits = numberValue(payroll, 'taxBeforeCredits')
  const taxAfterCredits = numberValue(payroll, 'taxAfterCredits')
  const averageHourly = calculationSnapshot?.averageHourlyEarnings ?? numberValue(payroll, 'averageHourlyEarnings')
  const taxpayerCreditApplied = employee.taxpayerCreditApplied ?? true
  const taxDeclarationSigned = employee.taxDeclarationSigned ?? true
  const employerCost = numberValue(payroll, 'hrubaMzda') + socialEmployer + healthEmployer

  return (
    <article data-print-document="issued-payslip-minimal-document" className="payslip-min-sheet">
      <header className="payslip-min-header">
        <div>
          <h1>Výplatní páska</h1>
          <p>Mzdový doklad zaměstnance · řádný · finální</p>
        </div>
        <div className="payslip-min-header-meta">
          <strong>{formatPeriod(month)}</strong>
          <span>Výplata: {employer.wagePaymentTerm || 'dle interního termínu'}</span>
          <span>Vystaveno: {formatDate(document.issuedAt || document.updatedAt)}</span>
        </div>
      </header>

      <section className="payslip-min-identity">
        <IdentityBlock
          title="Zaměstnavatel"
          rows={[
            ['Název', employer.legalName || employer.name],
            ['IČO', employer.ico],
            ['Sídlo', employer.registeredAddress || employer.seat],
          ]}
        />
        <IdentityBlock
          title="Zaměstnanec"
          rows={[
            ['Jméno a příjmení', employee.name],
            ['Osobní číslo', employee.employeeNumber],
            ['Pracovní vztah', `${EmploymentTypeLabels[employee.employmentType]} · ${formatNumber(employee.weeklyHours || 0)} h/týden · úvazek ${formatNumber(employee.workload ?? 1, 3)}`],
            ['Zdravotní pojišťovna', employee.healthInsuranceCompany || '-'],
            ['Prohlášení k dani', taxDeclarationSigned ? 'podepsáno' : 'nepodepsáno'],
          ]}
        />
      </section>

      <section>
        <SectionLabel>Mzdové složky</SectionLabel>
        <table className="payslip-min-table">
          <thead>
            <tr>
              <th>Složka mzdy</th>
              <th className="r">Hodiny</th>
              <th className="r">Sazba / základ</th>
              <th className="r">Částka</th>
            </tr>
          </thead>
          <tbody>
            {earningsRows.map(row => (
              <tr key={row.label} className={row.bold ? 'subtotal' : undefined}>
                <td>
                  {row.label}
                  {row.label === 'Základní mzda' && (
                    <span>odpracováno {formatNumber(timeSummary?.workedHours || 0)} h z fondu {formatNumber(documentSummary.workHoursWH)} h</span>
                  )}
                </td>
                <td className="r">{row.hrs || '-'}</td>
                <td className="r soft">{rowBasis(row, averageHourly || 0)}</td>
                <td className={row.neg ? 'r neg' : 'r'}>{rowAmount(row)}</td>
              </tr>
            ))}
            <tr className="subtotal">
              <td colSpan={3}>Hrubá mzda</td>
              <td className="r">{grossWage}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="payslip-min-gap">
        <SectionLabel>Odvody a záloha na daň</SectionLabel>
        <table className="payslip-min-table">
          <thead>
            <tr>
              <th>Položka</th>
              <th className="r">Základ</th>
              <th className="r">Sazba</th>
              <th className="r">Částka</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Sociální pojištění zaměstnanec</td>
              <td className="r">{grossWage}</td>
              <td className="r soft">{formatNumber(socialEmployeeRate * 100, 1).replace(',0', '')} %</td>
              <td className="r">{formatCzk(socialEmployee)}</td>
            </tr>
            <tr>
              <td>Zdravotní pojištění zaměstnanec</td>
              <td className="r">{grossWage}</td>
              <td className="r soft">{formatNumber(healthEmployeeRate * 100, 1).replace(',0', '')} %</td>
              <td className="r">{formatCzk(healthEmployee)}</td>
            </tr>
            <tr>
              <td>Základ pro zálohu na daň</td>
              <td className="r">{formatCzk(taxBase)}</td>
              <td className="r soft">-</td>
              <td className="r soft">-</td>
            </tr>
            <tr>
              <td>Záloha na daň před slevami</td>
              <td className="r">{formatCzk(taxBase)}</td>
              <td className="r soft">15 % / 23 %</td>
              <td className="r">{formatCzk(taxBeforeCredits)}</td>
            </tr>
            <tr>
              <td>Sleva na poplatníka</td>
              <td className="r soft">-</td>
              <td className="r soft">-</td>
              <td className="r soft">-{formatCzk(taxpayerCreditApplied ? taxpayerCredit : 0)}</td>
            </tr>
            <tr className="subtotal">
              <td colSpan={3}>Záloha na daň po slevách</td>
              <td className="r">{formatCzk(taxAfterCredits)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="payslip-min-recap">
        <RecapRow label="Hrubá mzda" value={grossWage} />
        <RecapRow label="Sociální pojištění zaměstnanec" value={formatSignedCzk(socialEmployee, 'minus')} neg />
        <RecapRow label="Zdravotní pojištění zaměstnanec" value={formatSignedCzk(healthEmployee, 'minus')} neg />
        <RecapRow label="Záloha na daň po slevách" value={formatSignedCzk(taxAfterCredits, 'minus')} neg />
        <RecapRow label="Srážky celkem" value={formatCzk(0)} />
        <div className="payslip-min-final">
          <div>
            <span>Čistá mzda</span>
            <strong>{netWage}</strong>
          </div>
          <div>
            <span>Částka k výplatě</span>
            <strong>{netWage}</strong>
          </div>
        </div>
      </section>

      <p className="payslip-min-note">
        <strong>Poznámka:</strong> Průměrný hodinový výdělek: {averageHourly ? `${formatNumber(averageHourly, 4)} Kč/h` : '-'} ({averageSourceLabel(calculationSnapshot?.averageEarningsSource)}).
        Dovolená: čerpáno {formatNumber(documentSummary.totalVacation)} h, zůstatek {formatNumber(employee.vacationRemainingHours)} h.
        Náklady zaměstnavatele celkem: <strong>{formatCzk(employerCost)}</strong>.
      </p>

      <footer className="payslip-min-footer">
        <div>
          <strong>{employer.legalName || employer.name}</strong> · IČO {employer.ico} · {employer.registeredAddress || employer.seat}
          <br />
          Výpočet: {formatDate(calculationSnapshot?.calculatedAt)} · Vystaveno: {formatDate(document.issuedAt || document.updatedAt)} · Verze {document.version} · Dokument nevyžaduje razítko
        </div>
        <div>Podpis zaměstnavatele</div>
      </footer>
    </article>
  )
}

function IdentityBlock({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div>
      <h2>{title}</h2>
      {rows.map(([label, value]) => (
        <div className="payslip-min-id-row" key={label}>
          <span>{label}</span>
          <strong>{value || '-'}</strong>
        </div>
      ))}
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return <h2 className="payslip-min-section-label">{children}</h2>
}

function RecapRow({ label, value, neg = false }: { label: string; value: string; neg?: boolean }) {
  return (
    <div className="payslip-min-recap-row">
      <span>{label}</span>
      <strong className={neg ? 'neg' : undefined}>{value}</strong>
    </div>
  )
}
