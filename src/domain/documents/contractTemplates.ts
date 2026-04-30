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
  const vacationDays = Math.round(contract.annualVacationWeeks * 5 * 100) / 100

  if (snapshot.template === 'minimum_2026') {
    const sections: TextDocumentTemplate['sections'] = [
      {
        heading: 'Pracovní smlouva',
        lines: [
          'uzavřená dle § 34 odst. 1 zákona č. 262/2006 Sb., zákoníku práce',
          '',
          `Zaměstnavatel: ${employer.legalName}, IČO ${employer.ico}, se sídlem ${employer.registeredAddress}, zastoupený ${employer.representativeName}, ${employer.representativeRole}`,
          'a',
          `Zaměstnanec: ${employee.name}, nar. ${formatCzechDate(employee.birthDate)}, bytem ${employee.address}`,
          '',
          'uzavírají tuto pracovní smlouvu:',
        ],
      },
      { heading: '§ 34 odst. 1 písm. a) — Druh práce', lines: [`Zaměstnanec bude pro zaměstnavatele vykonávat práci druhu: ${contract.jobType}.`] },
      { heading: '§ 34 odst. 1 písm. b) — Místo výkonu práce', lines: [`Místem výkonu práce je: ${contract.workplace}.`] },
      { heading: '§ 34 odst. 1 písm. c) — Den nástupu do práce', lines: [`Zaměstnanec nastoupí do práce dne: ${formatCzechDate(contract.startDate)}.`] },
      {
        heading: 'Závěrečná ustanovení',
        lines: [
          durationLine,
          'Ostatní práva a povinnosti smluvních stran, včetně mzdy, pracovní doby, dovolené a výpovědní doby, se řídí zákonem č. 262/2006 Sb., zákoníkem práce, ve znění pozdějších předpisů, a vnitřními předpisy zaměstnavatele, s nimiž byl zaměstnanec seznámen.',
          'Smlouva je vyhotovena ve dvou stejnopisech; každá smluvní strana obdrží jeden.',
          '',
          `V ${contract.signaturePlace} dne ${formatCzechDate(contract.contractConclusionDate)}`,
          '',
          'Zaměstnavatel: ______________________',
          `${employer.legalName}, ${employer.representativeName}, ${employer.representativeRole}`,
          '',
          'Zaměstnanec: ______________________',
          `${employee.name}, nar. ${formatCzechDate(employee.birthDate)}`,
        ],
      },
    ]

    return { sections, text: joinSections(sections) }
  }

  const sections: TextDocumentTemplate['sections'] = [
    {
      heading: 'Pracovní smlouva',
      lines: [
        'uzavřená podle § 34 a násl. zákona č. 262/2006 Sb., zákoníku práce, ve znění pozdějších předpisů',
        '',
        `Zaměstnavatel: ${employer.legalName}, IČO: ${employer.ico}, se sídlem ${employer.registeredAddress}, zastoupený ${employer.representativeName}, ${employer.representativeRole}`,
        `Zaměstnanec: ${employee.name}, datum narození ${formatCzechDate(employee.birthDate)}, bydliště ${employee.address}`,
        '',
        'Zaměstnavatel a zaměstnanec uzavírají níže uvedeného dne tuto pracovní smlouvu za podmínek dále stanovených.',
      ],
    },
    { heading: '1. Druh práce', lines: [`Zaměstnanec bude pro zaměstnavatele vykonávat práci: ${contract.jobType}.`] },
    { heading: '2. Místo výkonu práce', lines: [`Místem výkonu práce je: ${contract.workplace}.`] },
    { heading: '3. Den nástupu do práce', lines: [`Dnem nástupu do práce je: ${formatCzechDate(contract.startDate)}.`] },
    ...(contract.probationEnabled ? [{
      heading: '4. Zkušební doba',
      lines: [`Smluvní strany sjednávají zkušební dobu v délce ${contract.probationMonths} měsíců ode dne vzniku pracovního poměru.`],
    }] : []),
    { heading: contract.probationEnabled ? '5. Doba trvání pracovního poměru' : '4. Doba trvání pracovního poměru', lines: [durationLine] },
    { heading: contract.probationEnabled ? '6. Pracovní doba a rozvržení' : '5. Pracovní doba a rozvržení', lines: [`Stanovená týdenní pracovní doba činí ${contract.weeklyHours} hodin týdně.`] },
    { heading: contract.probationEnabled ? '7. Mzda' : '6. Mzda', lines: [`Zaměstnanci náleží hrubá měsíční mzda ve výši ${formatCurrencyCZK(contract.grossMonthlyWage)}.`] },
    { heading: contract.probationEnabled ? '8. Dovolená' : '7. Dovolená', lines: [`Zaměstnanci přísluší dovolená v délce ${contract.annualVacationWeeks} týdny za kalendářní rok, orientačně ${vacationDays} pracovních dnů při pětidenním pracovním týdnu.`] },
    { heading: contract.probationEnabled ? '9. Výpovědní doba' : '8. Výpovědní doba', lines: ['Výpovědní doba a způsoby skončení pracovního poměru se řídí zákoníkem práce, není-li písemně sjednáno nebo zákonem stanoveno jinak.'] },
    {
      heading: contract.probationEnabled ? '10. Závěrečná ustanovení' : '9. Závěrečná ustanovení',
      lines: [
        'Tato smlouva se řídí právním řádem České republiky, zejména zákonem č. 262/2006 Sb., zákoníkem práce.',
        'Vztahy touto smlouvou neupravené se řídí příslušnými ustanoveními zákoníku práce a navazujících právních předpisů.',
        'Smlouva nabývá platnosti a účinnosti dnem podpisu oběma smluvními stranami.',
        'Tato smlouva je vyhotovena ve dvou stejnopisech, z nichž každá smluvní strana obdrží jedno vyhotovení.',
        '',
        `V ${contract.signaturePlace} dne ${formatCzechDate(contract.contractConclusionDate)}`,
        '',
        'Za zaměstnavatele: ______________________',
        `${employer.legalName}, ${employer.representativeName}, ${employer.representativeRole}`,
        '',
        'Zaměstnanec: ______________________',
        `${employee.name}, nar. ${formatCzechDate(employee.birthDate)}`,
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
