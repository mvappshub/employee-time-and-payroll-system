import type { IssuedPayslipDocument } from '../../domain/shared/types'
import { DocumentLayout, DocumentMetaGrid, DocumentPart, DocumentTotalLine } from './DocumentLayout'

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
        <DocumentTotalLine label="Hrubá mzda" value={grossWage} />
      </DocumentPart>
      <DocumentPart heading="Odvody a daň">
        <DocumentRows rows={contributionRows} />
        <div className="document-table-group">
          <DocumentRows rows={taxRows} />
        </div>
        <DocumentTotalLine label="Čistá mzda k výplatě" value={netWage} primary />
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
    <table className="document-table document-table--financial">
      <thead>
        <tr>
          <th>Položka</th>
          <th className="document-numeric">h</th>
          <th className="document-numeric">dnů</th>
          <th className="document-numeric">Kč</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.label} className={row.bold ? 'document-row--strong' : undefined}>
            <td>{row.label}</td>
            <td className="document-numeric">{row.hrs || ''}</td>
            <td className="document-numeric">{row.days || ''}</td>
            <td className={row.neg ? 'document-numeric document-amount--negative' : 'document-numeric'}>{row.czk || ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
