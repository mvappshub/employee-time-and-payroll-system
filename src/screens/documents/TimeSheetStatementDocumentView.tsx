import type { TimeSheetStatementDocument } from '../../domain/shared/types'
import { DocumentLayout, DocumentMetaGrid, DocumentPart } from './DocumentLayout'

export function TimeSheetStatementDocumentView({ document }: { document: TimeSheetStatementDocument }) {
  const { employer, employee, month, rows, totals } = document.snapshot

  return (
    <DocumentLayout
      documentId="time-sheet-document"
      title="Výpis evidence pracovní doby"
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
            { label: 'Pracovní pozice', value: employee.contractJobTitle },
            { label: 'Bydliště', value: employee.permanentAddress },
            { label: 'Období', value: month },
          ]}
        />
      </DocumentPart>
      <DocumentPart heading="Denní evidence">
        <table className="document-table document-table--compact">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Směna</th>
              <th>Příchod</th>
              <th>Odchod</th>
              <th>Přestávka</th>
              <th className="document-numeric">Odprac.</th>
              <th className="document-numeric">Přesčas</th>
              <th className="document-numeric">Noční</th>
              <th>Poznámka</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.date}>
                <td>{row.date}</td>
                <td>{row.shift || '—'}</td>
                <td>{row.arrival || '—'}</td>
                <td>{row.departure || '—'}</td>
                <td>{row.breakStart && row.breakEnd ? `${row.breakStart}-${row.breakEnd}` : '—'}</td>
                <td className="document-numeric">{row.workedHours.toFixed(1)}</td>
                <td className="document-numeric">{row.overtimeHours.toFixed(1)}</td>
                <td className="document-numeric">{row.nightHours.toFixed(1)}</td>
                <td>{row.absenceLabel || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DocumentPart>
      <DocumentPart heading="Souhrn období">
        <DocumentMetaGrid
          rows={[
            { label: 'Odpracované hodiny', value: totals.workedHours.toFixed(1) },
            { label: 'Přesčas', value: totals.overtimeHours.toFixed(1) },
            { label: 'Noční práce', value: totals.nightHours.toFixed(1) },
            { label: 'Dovolená', value: totals.vacationHours.toFixed(1) },
            { label: 'Nemoc', value: totals.sickHours.toFixed(1) },
            { label: 'Saldo', value: totals.totalSaldo.toFixed(1) },
          ]}
        />
      </DocumentPart>
    </DocumentLayout>
  )
}
