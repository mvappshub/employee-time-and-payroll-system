import type { ReactNode } from 'react'

function formatIssuedDate(value?: string): string | null {
  if (!value) {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function DocumentLayout({
  documentId,
  title,
  subtitle,
  issuedAt,
  children,
  footer,
}: {
  documentId: string
  title: string
  subtitle: string
  issuedAt?: string
  children: ReactNode
  footer?: ReactNode
}) {
  const formattedIssuedAt = formatIssuedDate(issuedAt)

  return (
    <article
      data-print-document={documentId}
      className="document-sheet"
    >
      <header className="document-header">
        <div>
          <h1 className="document-title">{title}</h1>
          <p className="document-subtitle">{subtitle}</p>
        </div>
        {formattedIssuedAt && (
          <div className="document-issued-box">
            <span>Datum vystavení</span>
            <strong>{formattedIssuedAt}</strong>
          </div>
        )}
      </header>
      <div className="document-body">{children}</div>
      {footer && <footer className="document-footer">{footer}</footer>}
    </article>
  )
}

export function DocumentPart({
  heading,
  children,
}: {
  heading: string
  children: ReactNode
}) {
  return (
    <section className="document-part">
      <h2 className="document-part-title">{heading}</h2>
      {children}
    </section>
  )
}

export function DocumentMetaGrid({
  rows,
}: {
  rows: Array<{ label: string; value: string }>
}) {
  return (
    <dl className="document-meta-grid">
      {rows.map(row => (
        <div key={row.label} className="document-meta-row">
          <dt>{row.label}</dt>
          <dd>{row.value || '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

export function DocumentSignatureGrid({
  signatures,
}: {
  signatures: Array<{ label: string; name: string; role?: string }>
}) {
  return (
    <div className="document-signatures">
      {signatures.map(signature => (
        <div key={signature.label} className="document-signature">
          <div className="document-signature-line" />
          <div className="document-signature-label">{signature.label}</div>
          <div className="document-signature-name">{signature.name}</div>
          {signature.role && <div className="document-signature-role">{signature.role}</div>}
        </div>
      ))}
    </div>
  )
}

export function DocumentTotalLine({
  label,
  value,
  primary = false,
}: {
  label: string
  value: string
  primary?: boolean
}) {
  return (
    <div className={`document-total-line${primary ? ' document-total-line--primary' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
