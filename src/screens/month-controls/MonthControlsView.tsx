export interface MonthControlsViewProps {
  error: string
  onLoad: () => void | Promise<void>
  onSave: () => void | Promise<void>
  onPrefill: () => void
}

const btn = 'border border-gray-300 px-1.5 py-0.5 text-xs bg-white hover:bg-gray-50'

export function MonthControlsView({ error, onLoad, onSave, onPrefill }: MonthControlsViewProps) {
  return (
    <div className="mb-2 border-b border-gray-200 pb-1 text-xs">
      <div className="flex flex-wrap items-center gap-1">
        <button className={btn} onClick={onLoad}>Načíst měsíc</button>
        <button className={btn} onClick={onSave}>Uložit měsíc</button>
        <button className={btn} onClick={onPrefill}>Předvyplnit měsíc</button>
      </div>
      {error && <div className="mt-1 border border-red-300 bg-red-50 px-2 py-1 text-red-700">{error}</div>}
    </div>
  )
}
