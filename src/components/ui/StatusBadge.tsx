import { Badge, type BadgeTone } from './Badge'

function toneFor(value: string): BadgeTone {
  const v = value.toLowerCase()
  if (value === '—' || v === 'bez dat' || v === 'bez měsíce') return 'muted'
  if (v.includes('vystav') || v.includes('schvál')) return 'success'
  if (v.includes('spočít') || v.includes('uzavř')) return 'info'
  if (v.includes('uložen') || v.includes('rozprac')) return 'warning'
  return 'neutral'
}

export function StatusBadge({ value }: { value: string }) {
  if (!value || value === '—') {
    return <span className="text-slate-400">—</span>
  }
  return <Badge tone={toneFor(value)}>{value}</Badge>
}
