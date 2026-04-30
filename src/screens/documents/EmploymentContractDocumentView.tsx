import type { EmploymentContractDocument, HandoverProtocolDocument, Section37Document } from '../../domain/shared/types'
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
  return (
    <TextDocumentView
      document={document}
      documentId="employment-contract-document"
      title="Pracovní smlouva"
      subtitle={document.snapshot.employee.name}
    />
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
