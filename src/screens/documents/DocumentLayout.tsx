import type { ReactNode } from 'react'

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
  return (
    <article
      data-print-document={documentId}
      className="document-sheet rounded border border-slate-300 bg-white p-8 shadow-sm"
    >
      <header className="mb-6 border-b border-slate-300 pb-4">
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Personální dokument</div>
        <div className="mt-2 text-2xl font-semibold text-slate-900">{title}</div>
        <div className="mt-1 text-[13px] text-slate-600">{subtitle}</div>
        {issuedAt && <div className="mt-3 text-[12px] text-slate-500">Datum vystavení: {issuedAt}</div>}
      </header>
      <div className="space-y-5 text-[13px] leading-6 text-slate-800">{children}</div>
      {footer && <footer className="mt-8 border-t border-slate-300 pt-5">{footer}</footer>}
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
    <section>
      <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">{heading}</div>
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
    <div className="grid gap-2 md:grid-cols-2">
      {rows.map(row => (
        <div key={row.label} className="border border-slate-200 px-3 py-2">
          <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">{row.label}</div>
          <div className="mt-1 text-[13px] text-slate-800">{row.value || '—'}</div>
        </div>
      ))}
    </div>
  )
}
