import type { ReactNode } from 'react'
import type { EmploymentContractDocument, HandoverProtocolDocument, Section37Document } from '../../domain/shared/types'
import { formatCurrencyCZK, formatCzechDate } from '../../domain/documents/builders'
import { DocumentLayout, DocumentPart } from './DocumentLayout'

type TextDocument = EmploymentContractDocument | Section37Document | HandoverProtocolDocument

function TextDocumentView({
  document,
  documentId,
  title,
  subtitle,
}: {
  document: TextDocument
  documentId: string
  title: string
  subtitle: string
}) {
  const sections = Array.isArray(document.snapshot.sections)
    ? document.snapshot.sections
    : document.snapshot.text
      ? [{ heading: undefined, lines: document.snapshot.text.split('\n') }]
      : [{ heading: undefined, lines: ['Dokument je uložený ve starším formátu. Aktualizujte dokument.'] }]

  return (
    <DocumentLayout
      documentId={documentId}
      title={title}
      subtitle={subtitle}
      issuedAt={document.issuedAt || document.generatedAt || document.updatedAt}
    >
      {sections.map(section => (
        <DocumentPart key={`${section.heading || 'section'}-${section.lines.join('|')}`} heading={section.heading || ''}>
          <div className="document-prose whitespace-pre-line">
            {section.lines.map((line, lineIndex) => (
              line ? <p key={lineIndex}>{line}</p> : <br key={lineIndex} />
            ))}
          </div>
        </DocumentPart>
      ))}
    </DocumentLayout>
  )
}

export function EmploymentContractDocumentView({ document }: { document: EmploymentContractDocument }) {
  const { employer, employee, contract } = document.snapshot
  const durationText = contract.durationType === 'fixed_term'
    ? `určitou do ${formatCzechDate(contract.fixedTermEndDate)}`
    : 'neurčitou'
  const vacationDays = Math.round(contract.annualVacationWeeks * 5 * 100) / 100

  if (document.snapshot.template === 'minimum_2026') {
    return (
      <article data-print-document="employment-contract-document" className="contract-sheet contract-sheet--minimum">
        <header className="contract-min-header">
          <h1>Pracovní smlouva</h1>
          <p>uzavřená dle § 34 odst. 1 zákona č. 262/2006 Sb., zákoníku práce</p>
        </header>

        <section className="contract-min-preamble">
          <p>
            <strong>Zaměstnavatel:</strong> {employer.legalName}, IČO {employer.ico}, se sídlem {employer.registeredAddress},
            zastoupený {employer.representativeName}, {employer.representativeRole}
          </p>
          <p><strong>a</strong></p>
          <p>
            <strong>Zaměstnanec:</strong> {employee.name}, nar. {formatCzechDate(employee.birthDate)}, bytem {employee.address}
          </p>
          <p>uzavírají tuto pracovní smlouvu:</p>
        </section>

        <div className="contract-rule" />

        <section className="contract-min-article">
          <h2>§ 34 odst. 1 písm. a) — Druh práce</h2>
          <p>Zaměstnanec bude pro zaměstnavatele vykonávat práci druhu: <strong>{contract.jobType}</strong>.</p>
        </section>
        <section className="contract-min-article">
          <h2>§ 34 odst. 1 písm. b) — Místo výkonu práce</h2>
          <p>Místem výkonu práce je: <strong>{contract.workplace}</strong>.</p>
        </section>
        <section className="contract-min-article">
          <h2>§ 34 odst. 1 písm. c) — Den nástupu do práce</h2>
          <p>Zaměstnanec nastoupí do práce dne: <strong>{formatCzechDate(contract.startDate)}</strong>.</p>
        </section>

        <div className="contract-rule" />

        <section className="contract-min-closing">
          <p>
            Pracovní poměr se sjednává na dobu <strong>{durationText}</strong>. Ostatní práva a povinnosti smluvních stran,
            včetně mzdy, pracovní doby, dovolené a výpovědní doby, se řídí zákonem č. 262/2006 Sb., zákoníkem práce,
            ve znění pozdějších předpisů, a vnitřními předpisy zaměstnavatele, s nimiž byl zaměstnanec seznámen.
          </p>
          <p>Smlouva je vyhotovena ve dvou stejnopisech; každá smluvní strana obdrží jeden.</p>
        </section>

        <SignatureBlock
          place={contract.signaturePlace}
          date={formatCzechDate(contract.contractConclusionDate)}
          employerName={employer.legalName}
          representative={`${employer.representativeName}, ${employer.representativeRole}`}
          employeeName={employee.name}
          employeeBirthDate={formatCzechDate(employee.birthDate)}
          compact
        />

        <footer className="contract-min-footer">
          <span>Pracovní smlouva - zákonné minimum 2026</span>
          <span>1 / 1</span>
        </footer>
      </article>
    )
  }

  return (
    <article data-print-document="employment-contract-document" className="contract-sheet contract-sheet--full">
      <header className="contract-full-header">
        <div className="contract-full-label">Vzorový dokument · Zákoník práce ČR</div>
        <h1>Pracovní smlouva</h1>
        <p>uzavřená podle § 34 a násl. zákona č. 262/2006 Sb., zákoníku práce, ve znění pozdějších předpisů</p>
      </header>

      <div className="contract-note">
        <strong>Zákonné minimum dle § 34 odst. 1 ZP:</strong> pracovní smlouva musí obsahovat druh práce,
        místo výkonu práce a den nástupu. Ostatní ujednání jsou smluvní nebo informační.
      </div>

      <section className="contract-parties">
        <PartyBox title="Zaměstnavatel" rows={[
          ['Obchodní firma / název', employer.legalName],
          ['IČO', employer.ico],
          ['Sídlo', employer.registeredAddress],
          ['Zastoupen/a', `${employer.representativeName}, ${employer.representativeRole}`],
        ]} />
        <PartyBox title="Zaměstnanec" rows={[
          ['Jméno a příjmení', employee.name],
          ['Datum narození', formatCzechDate(employee.birthDate)],
          ['Trvalé bydliště', employee.address],
          ['Interní osobní číslo', employee.personalNumberInternal || '—'],
        ]} />
      </section>

      <p className="contract-preamble">
        Zaměstnavatel a zaměstnanec uzavírají níže uvedeného dne tuto pracovní smlouvu za podmínek dále stanovených.
      </p>

      <ContractArticle title="Čl. I - Druh práce" tag="povinné § 34/1a">
        Zaměstnanec bude vykonávat práci na pozici: <strong>{contract.jobType}</strong>.
      </ContractArticle>
      <ContractArticle title="Čl. II - Místo výkonu práce" tag="povinné § 34/1b">
        Místem výkonu práce je: <strong>{contract.workplace}</strong>.
      </ContractArticle>
      <ContractArticle title="Čl. III - Den nástupu do práce" tag="povinné § 34/1c">
        Zaměstnanec nastoupí do práce dne: <strong>{formatCzechDate(contract.startDate)}</strong>.
      </ContractArticle>
      {contract.probationEnabled && (
        <ContractArticle title="Čl. IV - Zkušební doba">
          Smluvní strany sjednávají zkušební dobu v délce <strong>{contract.probationMonths} měsíců</strong> ode dne vzniku pracovního poměru.
        </ContractArticle>
      )}
      <ContractArticle title={`${contract.probationEnabled ? 'Čl. V' : 'Čl. IV'} - Doba trvání pracovního poměru`}>
        Pracovní poměr se sjednává na dobu <strong>{durationText}</strong>.
      </ContractArticle>
      <ContractArticle title={`${contract.probationEnabled ? 'Čl. VI' : 'Čl. V'} - Pracovní doba a rozvržení`}>
        Týdenní pracovní doba činí <strong>{contract.weeklyHours} hodin</strong>.
      </ContractArticle>
      <ContractArticle title={`${contract.probationEnabled ? 'Čl. VII' : 'Čl. VI'} - Mzda`}>
        <table className="contract-wage-table">
          <tbody>
            <tr><td>Druh mzdy</td><td>měsíční</td></tr>
            <tr><td>Výše základní mzdy</td><td><strong>{formatCurrencyCZK(contract.grossMonthlyWage)} hrubého měsíčně</strong></td></tr>
          </tbody>
        </table>
      </ContractArticle>
      <ContractArticle title={`${contract.probationEnabled ? 'Čl. VIII' : 'Čl. VII'} - Dovolená`}>
        Zaměstnanci přísluší dovolená v délce <strong>{contract.annualVacationWeeks} týdny</strong> za kalendářní rok
        {Number.isFinite(vacationDays) ? `, orientačně ${vacationDays} pracovních dnů při pětidenním pracovním týdnu` : ''}.
      </ContractArticle>
      <ContractArticle title={`${contract.probationEnabled ? 'Čl. IX' : 'Čl. VIII'} - Výpovědní doba`}>
        Výpovědní doba a způsoby skončení pracovního poměru se řídí zákoníkem práce, není-li písemně sjednáno nebo zákonem stanoveno jinak.
      </ContractArticle>
      <ContractArticle title={`${contract.probationEnabled ? 'Čl. X' : 'Čl. IX'} - Závěrečná ustanovení`}>
        Tato smlouva se řídí právním řádem České republiky, zejména zákonem č. 262/2006 Sb., zákoníkem práce.
        Je vyhotovena ve dvou stejnopisech, z nichž každá smluvní strana obdrží jeden.
      </ContractArticle>

      <SignatureBlock
        place={contract.signaturePlace}
        date={formatCzechDate(contract.contractConclusionDate)}
        employerName={employer.legalName}
        representative={`${employer.representativeName}, ${employer.representativeRole}`}
        employeeName={employee.name}
        employeeBirthDate={formatCzechDate(employee.birthDate)}
      />

      <footer className="contract-copy-note">
        Tento vzor slouží jako pomůcka a je přizpůsoben údajům evidovaným v aplikaci.
      </footer>
    </article>
  )
}

function PartyBox({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div className="contract-party-box">
      <h2>{title}</h2>
      {rows.map(([label, value]) => (
        <div key={label} className="contract-party-row">
          <span>{label}</span>
          <strong>{value || '—'}</strong>
        </div>
      ))}
    </div>
  )
}

function ContractArticle({ title, tag, children }: { title: string; tag?: string; children: ReactNode }) {
  return (
    <section className="contract-article">
      <h2>{title}{tag && <span>{tag}</span>}</h2>
      <div>{children}</div>
    </section>
  )
}

function SignatureBlock({
  place,
  date,
  employerName,
  representative,
  employeeName,
  employeeBirthDate,
  compact = false,
}: {
  place: string
  date: string
  employerName: string
  representative: string
  employeeName: string
  employeeBirthDate: string
  compact?: boolean
}) {
  return (
    <section className={compact ? 'contract-signatures contract-signatures--compact' : 'contract-signatures'}>
      <p>V {place}, dne {date}</p>
      <div className="contract-signature-grid">
        <div>
          <h2>Za zaměstnavatele</h2>
          <div className="contract-signature-line" />
          <strong>{employerName}</strong>
          <span>{representative}</span>
        </div>
        <div>
          <h2>Zaměstnanec</h2>
          <div className="contract-signature-line" />
          <strong>{employeeName}</strong>
          <span>nar. {employeeBirthDate}</span>
        </div>
      </div>
    </section>
  )
}

export function Section37DocumentView({ document }: { document: Section37Document }) {
  return (
    <TextDocumentView
      document={document}
      documentId="section37-document"
      title="Informace podle § 37"
      subtitle={document.snapshot.employee.name}
    />
  )
}

export function HandoverProtocolDocumentView({ document }: { document: HandoverProtocolDocument }) {
  return (
    <TextDocumentView
      document={document}
      documentId="handover-protocol-document"
      title="Potvrzení o předání dokumentů"
      subtitle={document.snapshot.employee.name}
    />
  )
}
