import type { IssuedPayslipDocument } from '../../domain/shared/types'
import { DocumentLayout, DocumentMetaGrid, DocumentPart } from './DocumentLayout'

export function IssuedPayslipDocumentView({
  document,
  earningsRows,
  contributionRows,
  taxRows,
  recapRows,
  grossWage,
  netWage,
}: {
  document: IssuedPayslipDocument
  earningsRows: Array<{ label: string; hrs?: string; days?: string; czk?: string; bold?: boolean; neg?: boolean }>
  contributionRows: Array<{ label: string; czk?: string; bold?: boolean; neg?: boolean }>
  taxRows: Array<{ label: string; czk?: string; bold?: boolean; neg?: boolean }>
  recapRows: Array<{ label: string; hrs?: string; czk?: string; bold?: boolean }>
  grossWage: string
  netWage: string
}) {
  const { employer, employee, month, calculationSnapshot } = document.snapshot

  return (
    <DocumentLayout
      documentId="issued-payslip-document"
      title="Výplatní páska"
      subtitle={`${employee.name} · ${month}`}
      issuedAt={document.issuedAt || document.updatedAt}
    >
      <DocumentPart heading="Identifikace">
        <DocumentMetaGrid
          rows={[
            { label: 'Zaměstnavatel', value: employer.name },
            { label: 'IČO', value: employer.ico },
            { label: 'Sídlo', value: employer.seat },
            { label: 'Zaměstnanec', value: employee.name },
            { label: 'Osobní číslo', value: employee.employeeNumber },
            { label: 'Období', value: month },
            { label: 'Datum výpočtu', value: calculationSnapshot?.calculatedAt || '—' },
            { label: 'Zdroj podkladu', value: calculationSnapshot?.averageEarningsSource || '—' },
          ]}
        />
      </DocumentPart>
      <DocumentPart heading="Mzdové položky">
        <DocumentRows rows={earningsRows} />
        <div className="mt-3 border-t-2 border-slate-400 pt-2 text-right text-sm font-semibold">Hrubá mzda: {grossWage}</div>
      </DocumentPart>
      <DocumentPart heading="Odvody a daň">
        <DocumentRows rows={contributionRows} />
        <div className="mt-3 border-t border-slate-300 pt-3">
          <DocumentRows rows={taxRows} />
        </div>
        <div className="mt-3 border-t-2 border-slate-400 pt-2 text-right text-base font-semibold">Čistá mzda: {netWage}</div>
      </DocumentPart>
      <DocumentPart heading="Rekapitulace">
        <DocumentRows rows={recapRows} />
      </DocumentPart>
    </DocumentLayout>
  )
}

function DocumentRows({
  rows,
}: {
  rows: Array<{ label: string; hrs?: string; days?: string; czk?: string; bold?: boolean; neg?: boolean }>
}) {
  return (
    <table className="w-full border-collapse text-[12px]">
      <thead>
        <tr className="border-b border-slate-300 text-left text-slate-500">
          <th>Položka</th>
          <th className="text-right">h</th>
          <th className="text-right">dnů</th>
          <th className="text-right">Kč</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.label} className={`border-b border-slate-200 ${row.bold ? 'font-semibold' : ''}`}>
            <td>{row.label}</td>
            <td className="text-right">{row.hrs || ''}</td>
            <td className="text-right">{row.days || ''}</td>
            <td className={`text-right ${row.neg ? 'text-red-700' : ''}`}>{row.czk || ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
