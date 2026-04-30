import type { EmploymentContractDocument } from '../../domain/shared/types'
import { DocumentLayout, DocumentMetaGrid, DocumentPart } from './DocumentLayout'

export function EmploymentContractDocumentView({ document }: { document: EmploymentContractDocument }) {
  const { employer, employee } = document.snapshot

  return (
    <DocumentLayout
      documentId="employment-contract-document"
      title="Pracovní smlouva"
      subtitle={`${employee.name} · ${employee.contractJobTitle}`}
      issuedAt={document.issuedAt || document.updatedAt}
      footer={
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="mb-12 border-b border-slate-400" />
            <div className="text-[12px] text-slate-600">{employer.representativeName}, {employer.representativeRole}</div>
          </div>
          <div>
            <div className="mb-12 border-b border-slate-400" />
            <div className="text-[12px] text-slate-600">{employee.name}</div>
          </div>
        </div>
      }
    >
      <DocumentPart heading="Smluvní strany">
        <DocumentMetaGrid
          rows={[
            { label: 'Zaměstnavatel', value: employer.name },
            { label: 'IČO', value: employer.ico },
            { label: 'Sídlo', value: employer.seat },
            { label: 'Jednající osoba', value: `${employer.representativeName}, ${employer.representativeRole}` },
            { label: 'Zaměstnanec', value: employee.name },
            { label: 'Osobní číslo', value: employee.employeeNumber },
            { label: 'Bydliště', value: employee.permanentAddress },
            { label: 'Den nástupu', value: employee.employmentStartDate },
          ]}
        />
      </DocumentPart>
      <DocumentPart heading="Sjednané podmínky">
        <DocumentMetaGrid
          rows={[
            { label: 'Druh práce', value: employee.contractJobTitle },
            { label: 'Místo výkonu práce', value: employee.contractWorkplace },
            { label: 'Pracovní doba / úvazek', value: employee.contractWorkSchedule },
            { label: 'Mzdový režim', value: `Mzda ${employee.baseSalary.toLocaleString('cs-CZ')} Kč` },
            { label: 'Týdenní rozsah', value: `${employee.weeklyHours} hodin` },
            { label: 'Zkušební doba', value: employee.probationMonths ? `${employee.probationMonths} měsíce` : 'nesjednána' },
            { label: 'Doba určitá do', value: employee.fixedTermEndDate || 'na dobu neurčitou' },
            { label: 'Datum ukončení', value: employee.employmentEndDate || 'není sjednáno' },
          ]}
        />
      </DocumentPart>
      <DocumentPart heading="Ujednání">
        <p>
          Zaměstnanec nastupuje do pracovního poměru dne {employee.employmentStartDate} na pracovní pozici {employee.contractJobTitle}.
          Místem výkonu práce je {employee.contractWorkplace}. Sjednaná pracovní doba činí {employee.contractWorkSchedule}.
        </p>
        <p>
          Smluvní strany potvrzují, že se seznámily s pracovními podmínkami, mzdovým režimem a dalšími povinnostmi
          vyplývajícími z pracovněprávního vztahu.
        </p>
      </DocumentPart>
    </DocumentLayout>
  )
}
