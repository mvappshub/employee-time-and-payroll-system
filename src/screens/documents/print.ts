export function printDocumentById(documentId: string): void {
  const documents = Array.from(window.document.querySelectorAll<HTMLElement>('[data-print-document]'))
  const active = window.document.querySelector<HTMLElement>(`[data-print-document="${documentId}"]`)
  if (!active) return

  documents.forEach(element => {
    element.dataset.printActive = element === active ? 'true' : 'false'
  })

  window.print()

  window.setTimeout(() => {
    documents.forEach(element => {
      delete element.dataset.printActive
    })
  }, 0)
}
