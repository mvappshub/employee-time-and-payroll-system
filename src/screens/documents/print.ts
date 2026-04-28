export function printDocumentById(documentId: string): boolean {
  const documents = Array.from(window.document.querySelectorAll<HTMLElement>('[data-print-document]'))
  const active = window.document.querySelector<HTMLElement>(`[data-print-document="${documentId}"]`)
  if (!active) {
    console.error(`printDocumentById: document "${documentId}" was not found in DOM`)
    return false
  }

  documents.forEach(element => {
    element.dataset.printActive = element === active ? 'true' : 'false'
  })

  try {
    window.print()
    return true
  } catch (error) {
    console.error(`printDocumentById: browser print failed for "${documentId}"`, error)
    return false
  } finally {
    window.setTimeout(() => {
      documents.forEach(element => {
        delete element.dataset.printActive
      })
    }, 0)
  }
}
