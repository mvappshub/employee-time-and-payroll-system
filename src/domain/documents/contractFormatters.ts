export function formatCzechDate(date: string | null | undefined): string {
  if (!date) return ''
  const match = String(date).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return String(date)
  const day = Number(match[3])
  const month = Number(match[2])
  const year = Number(match[1])
  if (!day || !month || !year) return String(date)
  return `${day}. ${month}. ${year}`
}

export function formatCurrencyCZK(amount: number | null | undefined): string {
  const safeAmount = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0
  return `${Math.round(safeAmount).toLocaleString('cs-CZ').replace(/\u00a0/g, ' ')} Kč`
}

export function normalizeIco(ico: string | number | null | undefined): string {
  const digits = String(ico ?? '').replace(/\s+/g, '')
  if (!/^\d+$/.test(digits)) return ''
  return digits.padStart(8, '0')
}

export function validateIco(ico: string | number | null | undefined): boolean {
  const normalized = normalizeIco(ico)
  if (!/^\d{8}$/.test(normalized)) return false

  const digits = normalized.split('').map(Number)
  const sum = digits.slice(0, 7).reduce((total, digit, index) => total + digit * (8 - index), 0)
  const remainder = sum % 11
  const checkDigit = remainder === 0 ? 1 : remainder === 1 ? 0 : 11 - remainder
  return checkDigit === digits[7]
}
