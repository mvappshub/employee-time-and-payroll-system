import { useStore } from '../../infrastructure/state/store'

const inp = 'w-full border border-slate-200 bg-white px-2 py-1 text-[12px] outline-none'

export function CompanyScreen() {
  const employer = useStore(s => s.employer)
  const setEmployer = useStore(s => s.setEmployer)

  return (
    <section className="max-w-2xl rounded border border-slate-200 bg-white p-4">
      <div className="mb-4 text-sm font-semibold text-slate-900">Firma</div>
      <div className="grid gap-4">
        <label className="grid gap-1">
          <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Název</span>
          <input className={inp} value={employer.name} onChange={e => setEmployer({ name: e.target.value })} />
        </label>
        <label className="grid gap-1">
          <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">IČO</span>
          <input className={inp} value={employer.ico} onChange={e => setEmployer({ ico: e.target.value })} />
        </label>
        <label className="grid gap-1">
          <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Sídlo</span>
          <input className={inp} value={employer.seat} onChange={e => setEmployer({ seat: e.target.value })} />
        </label>
      </div>
      <div className="mt-4 text-[12px] text-green-700">Uložení probíhá průběžně ve store.</div>
    </section>
  )
}
