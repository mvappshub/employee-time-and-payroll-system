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

function formatSignedCzk(value: number, sign: 'plus' | 'minus' | 'plain' = 'plain'): string {
  if (sign === 'minus') return `-${formatCzk(value)}`
  if (sign === 'plus') return `+${formatCzk(value)}`
  return formatCzk(value)
}

function formatDate(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).format(date)
}

function percentRate(value: number): string {
  return `${formatNumber(value * 100, 1).replace(',0', '')} %`
}

function documentNumber(document: IssuedPayslipDocument): string {
  const employeeNumber = document.snapshot.employee.employeeNumber || document.referenceId
  return `VP-${document.snapshot.month}-${employeeNumber}`
}

function averageSourceLabel(source?: string): string {
  if (source === 'actual') return 'skutečný'
  if (source === 'probable') return 'pravděpodobný'
  return 'není k dispozici'
}

export function IssuedPayslipDocumentView({
  document,
  earningsRows,
  contributionRows,
  grossWage,
  netWage,
}: {
  document: IssuedPayslipDocument
  earningsRows: MoneyRow[]
  contributionRows: Array<{ label: string; czk?: string; bold?: boolean; neg?: boolean }>
  taxRows: Array<{ label: string; czk?: string; bold?: boolean; neg?: boolean }>
  recapRows: Array<{ label: string; hrs?: string; czk?: string; bold?: boolean }>
  grossWage: string
  netWage: string
}) {
  const { employer, employee, month, calculationSnapshot, documentSummary, timeSummary } = document.snapshot
  const payroll = document.snapshot.payrollResult as PayrollSnapshot
  const socialEmployeeRate = getConstantForMonth('socialEmployeeRate', month)
  const healthEmployeeRate = getConstantForMonth('healthEmployeeRate', month)
  const socialEmployerRate = getConstantForMonth('socialEmployerRate', month)
  const healthEmployerRate = getConstantForMonth('healthEmployerRate', month)
  const taxpayerCredit = getConstantForMonth('taxpayerCredit', month)
  const dailyFund = numberValue(payroll, 'dailyFund')
  const vacationUsed = employee.vacationUsedHours
  const vacationEntitlement = employee.vacationEntitlementHours
  const vacationRemaining = employee.vacationRemainingHours
  const vacationPercent = vacationEntitlement > 0 ? Math.min(100, Math.max(0, (vacationUsed / vacationEntitlement) * 100)) : 0
  const socialEmployee = numberValue(payroll, 'socialEmployee')
  const healthEmployee = numberValue(payroll, 'healthEmployee')
  const socialEmployer = numberValue(payroll, 'socialEmployer')
  const healthEmployer = numberValue(payroll, 'healthEmployer')
  const taxBase = numberValue(payroll, 'taxBase')
  const taxBeforeCredits = numberValue(payroll, 'taxBeforeCredits')
  const taxAfterCredits = numberValue(payroll, 'taxAfterCredits')
  const taxDeclarationSigned = employee.taxDeclarationSigned ?? true
  const taxpayerCreditApplied = employee.taxpayerCreditApplied ?? true
  const averageHourly = calculationSnapshot?.averageHourlyEarnings ?? numberValue(payroll, 'averageHourlyEarnings')
  const averageSource = averageSourceLabel(calculationSnapshot?.averageEarningsSource)

  return (
    <article data-print-document="issued-payslip-document" className="payslip-sheet">
      <header className="payslip-header">
        <div>
          <h1>Výplatní páska</h1>
          <p>Mzdový doklad zaměstnance · Řádný</p>
          <span className="payslip-status">Finální</span>
        </div>
        <dl className="payslip-header-meta">
          <div className="payslip-period">{month}</div>
          <MetaRow label="Doklad č." value={documentNumber(document)} />
          <MetaRow label="Verze" value={String(document.version)} />
          <MetaRow label="Výpočet" value={formatDate(calculationSnapshot?.calculatedAt)} />
          <MetaRow label="Vystaveno" value={formatDate(document.issuedAt || document.updatedAt)} />
          <MetaRow label="Výplata" value={employer.wagePaymentTerm || 'dle interního termínu'} />
        </dl>
      </header>

      <section className="payslip-identity-grid">
        <IdentityBlock
          title="Zaměstnavatel"
          rows={[
            ['Název', employer.legalName || employer.name],
            ['IČO', employer.ico],
            ['DIČ', '—'],
            ['Sídlo', employer.registeredAddress || employer.seat],
            ['Středisko', employee.contractWorkplace || '—'],
            ['Mzdová účtárna', employer.representativeName || '—'],
          ]}
        />
        <IdentityBlock
          title="Zaměstnanec"
          rows={[
            ['Jméno a příjmení', employee.name],
            ['Osobní číslo', employee.employeeNumber],
            ['Pracovní vztah', EmploymentTypeLabels[employee.employmentType]],
            ['Týdenní pracovní doba', employee.weeklyHours ? `${formatNumber(employee.weeklyHours)} h · úvazek ${formatNumber(employee.workload ?? 1, 3)}` : '—'],
            ['Zdravotní pojišťovna', employee.healthInsuranceCompany || '—'],
            ['Prohlášení k dani', taxDeclarationSigned ? 'Podepsáno' : 'Nepodepsáno'],
            ['Uplatněné slevy', taxpayerCreditApplied ? 'Sleva na poplatníka' : '—'],
            ['Datum nástupu', formatDate(employee.employmentStartDate)],
          ]}
        />
      </section>

      <section className="payslip-section">
        <h2>Pracovní čas a fond</h2>
        <table className="payslip-table payslip-time-table">
          <thead>
            <tr>
              <th>Položka</th>
              <th className="r">Dny</th>
              <th className="r">Hodiny</th>
              <th>Poznámka</th>
            </tr>
          </thead>
          <tbody>
            <TimeRow label="Měsíční fond pracovní doby" days={documentSummary.workDaysWH} hours={documentSummary.workHoursWH} note="plán dle kalendáře" />
            <TimeRow label="Odpracováno" days={timeSummary?.workedDays || 0} hours={timeSummary?.workedHours || 0} note="skutečně odpracované hodiny" strong />
            <TimeRow label="Dovolená čerpaná" days={dailyFund > 0 ? documentSummary.totalVacation / dailyFund : 0} hours={documentSummary.totalVacation} note="čerpáno v tomto období" />
            <TimeRow label="Nemoc" days={dailyFund > 0 ? documentSummary.totalSick / dailyFund : 0} hours={documentSummary.totalSick} note="náhrada DPN v období" />
            <TimeRow label="Přesčas" days={0} hours={documentSummary.totalOvertime} note={documentSummary.totalOvertime > 0 ? 'evidovaný přesčas' : '—'} />
            <TimeRow label="Svátek celkem" days={dailyFund > 0 ? documentSummary.totalHolidayTotal / dailyFund : 0} hours={documentSummary.totalHolidayTotal} note="svátek / práce ve svátek" />
          </tbody>
        </table>
        <div className="payslip-phv-strip">
          <span><strong>Průměrný hodinový výdělek:</strong> {averageHourly ? `${formatNumber(averageHourly, 4)} Kč/h` : '—'}</span>
          <span><strong>Typ průměru:</strong> {averageSource}</span>
          <span><strong>Sjednaná měsíční mzda:</strong> {formatCzk(employee.baseSalary)}</span>
        </div>
      </section>

      <section className="payslip-section">
        <h2>Mzdové složky</h2>
        <table className="payslip-table payslip-earnings-table">
          <thead>
            <tr>
              <th>Kód</th>
              <th>Položka</th>
              <th className="r">Základ / sazba</th>
              <th className="r">Dny</th>
              <th className="r">Hod.</th>
              <th className="r">Kč</th>
              <th className="c">SP</th>
              <th className="c">ZP</th>
              <th className="c">Daň</th>
            </tr>
          </thead>
          <tbody>
            {earningsRows.map((row, index) => (
              <tr key={row.label} className={row.bold ? 'payslip-row-strong' : undefined}>
                <td className="code">{String((index + 1) * 10).padStart(3, '0')}</td>
                <td>{row.label}</td>
                <td className="r muted">{row.label.includes('Příplatek') || row.label.includes('Dovolená') ? `${formatNumber(averageHourly || 0)} Kč/h` : 'měsíční fond'}</td>
                <td className="r">{row.days || '—'}</td>
                <td className="r">{row.hrs || '—'}</td>
                <td className={row.neg ? 'r neg' : 'r'}>{row.czk || '—'}</td>
                <td className="c"><Badge yes /></td>
                <td className="c"><Badge yes /></td>
                <td className="c"><Badge yes /></td>
              </tr>
            ))}
          </tbody>
          <tbody>
            <tr className="payslip-base-heading">
              <td colSpan={9}>Vyměřovací základy</td>
            </tr>
            <BaseRow label="Hrubá mzda / odměna" value={grossWage} strong />
            {contributionRows
              .filter(row => row.label.includes('Vyměřovací') || row.label.includes('Základ pro zálohu'))
              .map(row => <BaseRow key={row.label} label={row.label} value={row.czk || '—'} />)}
          </tbody>
        </table>
      </section>

      <div className="payslip-two-col">
        <section className="payslip-section">
          <h2>Odvody zaměstnanec</h2>
          <KeyValueRows
            rows={[
              [`Sociální pojištění (${percentRate(socialEmployeeRate)})`, formatCzk(socialEmployee)],
              [`Zdravotní pojištění (${percentRate(healthEmployeeRate)})`, formatCzk(healthEmployee)],
            ]}
            totalLabel="Odvody zaměstnanec celkem"
            totalValue={formatCzk(socialEmployee + healthEmployee)}
          />
          <h3 className="payslip-subtitle">Odvody zaměstnavatel - informačně</h3>
          <KeyValueRows
            muted
            rows={[
              [`Sociální pojištění (${percentRate(socialEmployerRate)})`, formatCzk(socialEmployer)],
              [`Zdravotní pojištění (${percentRate(healthEmployerRate)})`, formatCzk(healthEmployer)],
              ['Celkové náklady zaměstnavatele', formatCzk(numberValue(payroll, 'hrubaMzda') + socialEmployer + healthEmployer)],
            ]}
          />
        </section>

        <section className="payslip-section">
          <h2>Záloha na daň z příjmů</h2>
          <KeyValueRows
            rows={[
              ['Základ pro zálohu po zaokrouhlení', formatCzk(taxBase)],
              ['Daň 15 % / 23 %', formatCzk(taxBeforeCredits)],
              ['Prohlášení k dani', taxDeclarationSigned ? 'podepsáno' : 'nepodepsáno'],
              ['Sleva na poplatníka', taxpayerCreditApplied ? formatCzk(taxpayerCredit) : formatCzk(0)],
              ['Ostatní slevy', formatCzk(0)],
              ['Daňové zvýhodnění na děti', formatCzk(0)],
            ]}
            totalLabel="Záloha na daň po slevách"
            totalValue={formatCzk(taxAfterCredits)}
          />
        </section>
      </div>

      <div className="payslip-two-col">
        <section className="payslip-section">
          <h2>Dovolená - přehled čerpání</h2>
          <KeyValueRows
            rows={[
              ['Nárok za rok', `${formatNumber(vacationEntitlement)} h`],
              ['Čerpáno v tomto období', `${formatNumber(documentSummary.totalVacation)} h`],
              ['Čerpáno od začátku roku', `${formatNumber(vacationUsed)} h`],
              ['Krácení / korekce', `${formatNumber(0)} h`],
            ]}
            totalLabel="Zůstatek po tomto období"
            totalValue={`${formatNumber(vacationRemaining)} h`}
          />
          <div className="payslip-vacation-caption">Čerpáno {formatNumber(vacationUsed)} h z {formatNumber(vacationEntitlement)} h ({formatNumber(vacationPercent, 0)} %)</div>
          <div className="payslip-vacation-bar" aria-hidden="true">
            <span style={{ width: `${vacationPercent}%` }} />
            <span style={{ width: `${100 - vacationPercent}%` }} />
          </div>
        </section>

        <section className="payslip-section">
          <h2>Srážky, zálohy a benefity</h2>
          <KeyValueRows
            rows={[
              ['Záloha na mzdu', formatCzk(0)],
              ['Exekuce / insolvence', formatCzk(0)],
              ['Stravenkový paušál (odečet)', formatCzk(0)],
              ['Příspěvek zaměstnance na benefity', formatCzk(0)],
              ['Ostatní srážky dohodou', formatCzk(0)],
            ]}
            totalLabel="Srážky celkem"
            totalValue={formatCzk(0)}
          />
        </section>
      </div>

      <section className="payslip-recap">
        <h2>Rekapitulace výplaty</h2>
        <RecapRow label="Hrubá mzda" value={grossWage} />
        <RecapRow label={`Sociální pojištění zaměstnanec (${percentRate(socialEmployeeRate)})`} value={formatSignedCzk(socialEmployee, 'minus')} neg />
        <RecapRow label={`Zdravotní pojištění zaměstnanec (${percentRate(healthEmployeeRate)})`} value={formatSignedCzk(healthEmployee, 'minus')} neg />
        <RecapRow label="Záloha na daň po slevách" value={formatSignedCzk(taxAfterCredits, 'minus')} neg />
        <RecapRow label="Daňový bonus" value={formatSignedCzk(0, 'plus')} pos />
        <RecapRow label="Ostatní příjmy k výplatě" value={formatSignedCzk(0, 'plus')} />
        <RecapRow label="Srážky celkem" value={formatSignedCzk(0, 'minus')} neg />
        <div className="payslip-final-grid">
          <div>
            <span>Čistá mzda</span>
            <strong>{netWage}</strong>
          </div>
          <div className="primary">
            <span>Částka k výplatě</span>
            <strong>{netWage}</strong>
          </div>
        </div>
      </section>

      {calculationSnapshot?.averageEarningsSource === 'probable' && (
        <div className="payslip-warning">
          Průměrný hodinový výdělek je pravděpodobný. Doklad je platný, při uzávěrce ověřte rozhodné období a případný zpětný přepočet.
        </div>
      )}

      <footer className="payslip-footer">
        <div>
          <strong>{employer.legalName || employer.name}</strong> · IČO {employer.ico} · {employer.registeredAddress || employer.seat}
          <br />
          Výpočet provedla mzdová účtárna · Datum výpočtu: {formatDate(calculationSnapshot?.calculatedAt)} · Verze {document.version}
          <br />
          <span>Dokument byl vygenerován automaticky, je platný bez razítka a podpisu zpracovatele.</span>
        </div>
        <div className="payslip-signature">Podpis zaměstnavatele</div>
      </footer>
    </article>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}:</dt>
      <dd>{value || '—'}</dd>
    </div>
  )
}

function IdentityBlock({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <section>
      <h2>{title}</h2>
      {rows.map(([label, value]) => (
        <div className="payslip-id-row" key={label}>
          <span>{label}</span>
          <strong>{value || '—'}</strong>
        </div>
      ))}
    </section>
  )
}

function TimeRow({ label, days, hours, note, strong = false }: { label: string; days: number; hours: number; note: string; strong?: boolean }) {
  return (
    <tr className={strong ? 'payslip-row-strong' : undefined}>
      <td>{label}</td>
      <td className="r">{formatNumber(days)}</td>
      <td className="r">{formatNumber(hours)}</td>
      <td className="muted">{note}</td>
    </tr>
  )
}

function Badge({ yes }: { yes: boolean }) {
  return <span className={yes ? 'payslip-badge yes' : 'payslip-badge no'}>{yes ? 'ano' : 'ne'}</span>
}

function BaseRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <tr className={strong ? 'payslip-base-row strong' : 'payslip-base-row'}>
      <td colSpan={5}>{label}</td>
      <td className="r">{value}</td>
      <td colSpan={3}>Kč</td>
    </tr>
  )
}

function KeyValueRows({
  rows,
  totalLabel,
  totalValue,
  muted = false,
}: {
  rows: Array<[string, string]>
  totalLabel?: string
  totalValue?: string
  muted?: boolean
}) {
  return (
    <table className={muted ? 'payslip-kv-table muted' : 'payslip-kv-table'}>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td>{label}</td>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
      {totalLabel && (
        <tbody>
          <tr className="sum">
            <td>{totalLabel}</td>
            <td>{totalValue}</td>
          </tr>
        </tbody>
      )}
    </table>
  )
}

function RecapRow({ label, value, neg = false, pos = false }: { label: string; value: string; neg?: boolean; pos?: boolean }) {
  return (
    <div className="payslip-recap-row">
      <span>{label}</span>
      <strong className={neg ? 'neg' : pos ? 'pos' : undefined}>{value}</strong>
    </div>
  )
}
