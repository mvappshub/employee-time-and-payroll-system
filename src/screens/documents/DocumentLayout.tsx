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
      className="document-sheet rounded-lg border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
    >
      <header className="mb-5 border-b border-slate-200 pb-4">
        <div className="text-xl font-semibold text-slate-900">{title}</div>
        <div className="mt-1 text-[13px] text-slate-600">{subtitle}</div>
        {issuedAt && <div className="mt-3 text-[12px] text-slate-500">Datum vystavení: {issuedAt}</div>}
      </header>
      <div className="space-y-4 text-[13px] leading-6 text-slate-700">{children}</div>
      {footer && <footer className="mt-6 border-t border-slate-200 pt-4">{footer}</footer>}
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
      <div className="mb-2 text-sm font-semibold text-slate-900">{heading}</div>
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
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map(row => (
        <div key={row.label} className="rounded-md border border-slate-200 px-3 py-2">
          <div className="text-[11px] font-medium text-slate-500">{row.label}</div>
          <div className="mt-1 text-[13px] text-slate-900">{row.value || '—'}</div>
        </div>
      ))}
    </div>
  )
}
