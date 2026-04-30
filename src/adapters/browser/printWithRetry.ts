import { printDocumentById } from '../../screens/documents/print'

export interface PrintWithRetryOptions {
  attempts?: number
  delayMs?: number
}

export function printWithRetry(
  documentId: string,
  onFailure: (message: string) => void,
  options: PrintWithRetryOptions = {},
): void {
  const maxAttempts = options.attempts ?? 3
  const delayMs = options.delayMs ?? 50

  const tryPrint = (attempt: number) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const printed = printDocumentById(documentId)
        if (printed) return

        if (attempt >= maxAttempts - 1) {
          onFailure('Tisk dokumentu se nepodařilo spustit. Zkuste akci zopakovat.')
          return
        }

        window.setTimeout(() => {
          tryPrint(attempt + 1)
        }, delayMs)
      })
    })
  }

  tryPrint(0)
}
