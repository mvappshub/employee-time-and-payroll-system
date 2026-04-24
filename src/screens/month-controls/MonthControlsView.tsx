export interface MonthControlsViewProps {
  error: string
  info: string
  currentStatus: 'empty' | 'loaded' | 'prefilled' | 'save-incomplete' | 'saved' | 'modified' | 'closed' | 'approved'
  onLoad: () => void | Promise<void>
  onSave: () => void | Promise<void>
  onPrefill: () => void
  onCloseMonth: () => void
  onApproveMonth: () => void
}

const btn = 'px-0 py-1 text-[12px] text-slate-500 transition-colors duration-150 hover:text-slate-900'

export function MonthControlsView({ error, info, currentStatus, onLoad, onSave, onPrefill, onCloseMonth, onApproveMonth }: MonthControlsViewProps) {
  return (
    <div className="mb-8 text-xs">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <button className={btn} onClick={onLoad}>Načíst měsíc</button>
        <button className={btn} onClick={onSave}>Uložit měsíc</button>
        <button className={btn} onClick={onPrefill}>Předvyplnit měsíc</button>
        <button className={btn} onClick={onCloseMonth} disabled={currentStatus !== 'saved'}>Uzavřít evidenci</button>
        <button className={btn} onClick={onApproveMonth} disabled={currentStatus !== 'closed'}>Schválit mzdu</button>
      </div>
      {info && <div className="mt-3 text-[12px] text-slate-500">{info}</div>}
      {error && <div className="mt-3 text-[12px] text-slate-500">{error}</div>}
    </div>
  )
}
