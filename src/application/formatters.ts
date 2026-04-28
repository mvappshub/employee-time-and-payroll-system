export const formatCzk = (value: number): string =>
  value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

export const formatHours = (value: number): string =>
  value === 0 ? '—' : value.toFixed(1)

export const formatDays = (value: number): string =>
  value === 0 ? '—' : value.toFixed(1)

export const formatCompactNumber = (value: number): string =>
  value === 0 ? '' : value.toFixed(1)

export function formatMonthLabel(month: string): string {
  const [year, monthValue] = month.split('-')
  const names = ['', 'leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec']
  return `${names[parseInt(monthValue, 10)]} ${year}`
}
