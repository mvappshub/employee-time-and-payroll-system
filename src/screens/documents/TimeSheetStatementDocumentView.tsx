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
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-slate-400 text-left text-slate-500">
              <th>Datum</th>
              <th>Směna</th>
              <th>Příchod</th>
              <th>Odchod</th>
              <th className="text-right">Odprac.</th>
              <th className="text-right">Přesčas</th>
              <th className="text-right">Noční</th>
              <th>Poznámka</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.date} className="border-b border-slate-200">
                <td>{row.date}</td>
                <td>{row.shift || '—'}</td>
                <td>{row.arrival || '—'}</td>
                <td>{row.departure || '—'}</td>
                <td className="text-right">{row.workedHours.toFixed(1)}</td>
                <td className="text-right">{row.overtimeHours.toFixed(1)}</td>
                <td className="text-right">{row.nightHours.toFixed(1)}</td>
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
