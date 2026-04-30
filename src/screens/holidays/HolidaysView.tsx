import { Plus, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, CardContent } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'

export interface HolidaysViewProps {
  holidays: { date: string; name: string }[]
  newDate: string
  newName: string
  onNewDateChange: (v: string) => void
  onNewNameChange: (v: string) => void
  onHolidayChange: (i: number, h: { date: string; name: string }) => void
  onHolidayRemove: (i: number) => void
  onHolidayAdd: () => void
}

export function HolidaysView({
  holidays,
  newDate,
  newName,
  onNewDateChange,
  onNewNameChange,
  onHolidayChange,
  onHolidayRemove,
  onHolidayAdd,
}: HolidaysViewProps) {
  const grouped = holidays.reduce<Record<string, Array<{ holiday: { date: string; name: string }; index: number }>>>((acc, holiday, index) => {
    const year = holiday.date.slice(0, 4) || 'Bez data'
    acc[year] = acc[year] || []
    acc[year].push({ holiday, index })
    return acc
  }, {})

  return (
    <div className="max-w-3xl">
      <PageHeader title="Svátky" description="Státní svátky pro výpočet mezd" />
      <Card>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-[8rem_1fr_auto] items-end gap-2">
            <Input density="compact" type="date" placeholder="Datum" value={newDate} onChange={e => onNewDateChange(e.target.value)} />
            <Input density="compact" placeholder="název svátku" value={newName} onChange={e => onNewNameChange(e.target.value)} />
            <Button variant="primary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={onHolidayAdd}>Přidat</Button>
          </div>
        </CardContent>
        <div className="flex items-center gap-2 border-t border-slate-100 px-3 py-1.5 text-[10px] uppercase tracking-wide text-slate-500">
          <div className="w-32">Datum</div>
          <div className="flex-1">Název</div>
          <div className="w-20" />
        </div>
        {Object.entries(grouped).map(([year, items]) => (
          <div key={year}>
            <div className="border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">{year}</div>
            {items.map(({ holiday, index }) => (
              <div key={`${holiday.date}-${holiday.name}`} className="flex items-center gap-2 border-t border-slate-100 px-3 py-1.5 hover:bg-slate-50/80">
                <input type="date" className="h-6 w-32 rounded border border-slate-200 bg-white px-1.5 text-[11px] tabular focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20" value={holiday.date} onChange={e => onHolidayChange(index, { ...holiday, date: e.target.value })} />
                <input className="h-6 flex-1 rounded border border-slate-200 bg-white px-1.5 text-[11px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20" value={holiday.name} onChange={e => onHolidayChange(index, { ...holiday, name: e.target.value })} />
                <Button variant="ghost" size="xs" leftIcon={<Trash2 className="h-3 w-3" />} onClick={() => onHolidayRemove(index)}>Smazat</Button>
              </div>
            ))}
          </div>
        ))}
      </Card>
    </div>
  )
}
