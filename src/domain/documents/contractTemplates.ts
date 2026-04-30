import type { EmploymentContractSnapshot, HandoverProtocolSnapshot, Section37Snapshot } from '../shared/types'
import { formatCurrencyCZK, formatCzechDate } from './contractFormatters'

export interface TextDocumentTemplate {
  text: string
  sections: Array<{ heading?: string; lines: string[] }>
}
function joinSections(sections: TextDocumentTemplate['sections']): string {
  return sections
    .map(section => [
      section.heading,
      ...section.lines,
    ].filter(Boolean).join('\n'))
    .join('\n\n')
}

export function buildEmploymentContractDocument(snapshot: Omit<EmploymentContractSnapshot, 'text' | 'sections'>): TextDocumentTemplate {
  const employer = snapshot.employer
  const employee = snapshot.employee
  const contract = snapshot.contract
  const durationLine = contract.durationType === 'fixed_term'
    ? `Pracovní poměr se sjednává na dobu určitou do ${formatCzechDate(contract.fixedTermEndDate)}.`
    : 'Pracovní poměr se sjednává na dobu neurčitou.'

  const sections: TextDocumentTemplate['sections'] = [
    {
      heading: 'Pracovní smlouva',
      lines: [
        'Zaměstnavatel:',
        `${employer.legalName}, IČO: ${employer.ico}, se sídlem ${employer.registeredAddress}, zastoupený ${employer.representativeName}, ${employer.representativeRole}`,
        '',
        'Zaměstnanec:',
        `${employee.name}, datum narození ${formatCzechDate(employee.birthDate)}, bydliště ${employee.address}`,
        '',
        'Zaměstnavatel a zaměstnanec uzavírají podle zákona č. 262/2006 Sb., zákoník práce, tuto pracovní smlouvu:',
      ],
    },
    { heading: '1. Druh práce', lines: [`Zaměstnanec bude pro zaměstnavatele vykonávat práci: ${contract.jobType}.`] },
    { heading: '2. Místo výkonu práce', lines: [`Místem výkonu práce je: ${contract.workplace}.`] },
    { heading: '3. Den nástupu do práce', lines: [`Dnem nástupu do práce je: ${formatCzechDate(contract.startDate)}.`] },
    { heading: '4. Doba trvání pracovního poměru', lines: [durationLine] },
    ...(contract.probationEnabled ? [{
      heading: '5. Zkušební doba',
      lines: [`Smluvní strany sjednávají zkušební dobu v délce ${contract.probationMonths} měsíců ode dne vzniku pracovního poměru.`],
    }] : []),
    { heading: contract.probationEnabled ? '6. Týdenní pracovní doba' : '5. Týdenní pracovní doba', lines: [`Stanovená týdenní pracovní doba činí ${contract.weeklyHours} hodin týdně.`] },
    { heading: contract.probationEnabled ? '7. Mzda' : '6. Mzda', lines: [`Zaměstnanci náleží hrubá měsíční mzda ve výši ${formatCurrencyCZK(contract.grossMonthlyWage)}.`] },
    {
      heading: contract.probationEnabled ? '8. Vyhotovení smlouvy' : '7. Vyhotovení smlouvy',
      lines: [
        'Tato smlouva je vyhotovena ve dvou stejnopisech, z nichž každá smluvní strana obdrží jedno vyhotovení.',
        '',
        `V ${contract.signaturePlace} dne ${formatCzechDate(contract.contractConclusionDate)}`,
        '',
        'Za zaměstnavatele: ______________________',
        `${employer.representativeName}, ${employer.representativeRole}`,
        '',
        'Zaměstnanec: ______________________',
        employee.name,
      ],
    },
  ]

  return { sections, text: joinSections(sections) }
}

export function buildSection37Document(snapshot: Omit<Section37Snapshot, 'text' | 'sections'>): TextDocumentTemplate {
  const contract = snapshot.contract
  const duration = contract.durationType === 'fixed_term'
    ? `doba určitá do ${formatCzechDate(contract.fixedTermEndDate)}`
    : 'doba neurčitá'
  const probation = contract.probationEnabled
    ? `${contract.probationMonths} měsíců ode dne vzniku pracovního poměru`
    : 'nesjednána'

  const sections: TextDocumentTemplate['sections'] = [{
    heading: 'Informace o obsahu pracovního poměru podle § 37 zákoníku práce',
    lines: [
      `Zaměstnavatel: ${snapshot.employer.legalName}, ${snapshot.employer.registeredAddress}`,
      `Zaměstnanec: ${snapshot.employee.name}, datum narození ${formatCzechDate(snapshot.employee.birthDate)}, bydliště ${snapshot.employee.address}`,
      `Druh práce: ${contract.jobType}`,
      `Místo výkonu práce: ${contract.workplace}`,
      `Den nástupu: ${formatCzechDate(contract.startDate)}`,
      `Doba trvání pracovního poměru: ${duration}`,
      `Zkušební doba: ${probation}`,
      `Týdenní pracovní doba: ${contract.weeklyHours} hodin týdně`,
      `Způsob rozvržení pracovní doby: ${snapshot.employer.workScheduleText}`,
      `Vyrovnávací období: ${snapshot.employer.balancingPeriodText}`,
      `Rozsah práce přesčas: ${snapshot.employer.overtimeScopeText}`,
      `Dovolená: ${contract.annualVacationWeeks} týdny za kalendářní rok`,
      `Mzda: Hrubá měsíční mzda je sjednána v pracovní smlouvě ve výši ${formatCurrencyCZK(contract.grossMonthlyWage)}.`,
      `Splatnost mzdy: ${snapshot.employer.wageDueText}`,
      `Termín výplaty mzdy: ${snapshot.employer.wagePaymentTerm}`,
      `Místo výplaty mzdy: ${snapshot.employer.wagePaymentPlace}`,
      `Způsob výplaty mzdy: ${snapshot.employer.wagePaymentMethod}`,
      'Přestávka v práci: podle zákoníku práce, zpravidla nejdéle po 6 hodinách nepřetržité práce.',
      'Denní odpočinek: podle zákoníku práce.',
      'Týdenní odpočinek: podle zákoníku práce.',
      'Výpovědní doba: činí nejméně 2 měsíce, není-li sjednáno nebo zákonem stanoveno jinak.',
      'Odborný rozvoj: zaměstnavatel nezabezpečuje zvláštní odborný rozvoj.',
      'Kolektivní smlouvy: u zaměstnavatele není evidována kolektivní smlouva vztahující se na zaměstnance.',
      `Orgán sociálního zabezpečení: ${snapshot.employer.socialSecurityAuthority}`,
    ],
  }]

  return { sections, text: joinSections(sections) }
}

export function buildHandoverProtocolDocument(snapshot: Omit<HandoverProtocolSnapshot, 'text' | 'sections'>): TextDocumentTemplate {
  const sections: TextDocumentTemplate['sections'] = [{
    heading: 'Potvrzení o předání dokumentů',
    lines: [
      `Zaměstnanec: ${snapshot.employee.name}, datum narození ${formatCzechDate(snapshot.employee.birthDate)}`,
      `Datum předání: ${formatCzechDate(snapshot.handedOverAt || snapshot.generatedAt.slice(0, 10))}`,
      `Způsob předání: ${snapshot.handoverMethod || 'osobně'}`,
      '',
      '[ ] pracovní smlouva',
      '[ ] informace podle § 37 zákoníku práce',
      '[ ] informace o zpracování osobních údajů',
      ...(snapshot.hasBopDocuments ? ['[ ] BOZP/PO dokumenty'] : []),
      '',
      'Podpis zaměstnance: ______________________',
    ],
  }]

  return { sections, text: joinSections(sections) }
}
