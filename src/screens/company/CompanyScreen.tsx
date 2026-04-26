import { useEffect, useState } from 'react'
import { loadCompanyProfile, saveCompanyProfile } from '../../infrastructure/api/monthStorage'
import { useStore } from '../../infrastructure/state/store'
import type { EmployerProfile } from '../../domain/shared/types'

const inp = 'w-full border border-slate-200 bg-white px-2 py-1 text-[12px] outline-none'

function CompanyField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{label}</span>
      <input className={inp} value={value} onChange={e => onChange(e.target.value)} />
    </label>
  )
}

export function CompanyScreen() {
  const employer = useStore(s => s.employer)
  const setEmployer = useStore(s => s.setEmployer)
  const [saving, setSaving] = useState(false)
  const [info, setInfo] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    loadCompanyProfile()
      .then(profile => {
        if (!active) return
        setEmployer(profile)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [setEmployer])

  const updateField = (patch: Partial<EmployerProfile>) => {
    setInfo('')
    setError('')
    setEmployer(patch)
  }

  const onSave = async () => {
    setSaving(true)
    setInfo('')
    setError('')
    try {
      await saveCompanyProfile(employer)
      setInfo('Firemní profil byl uložen do perzistentního úložiště.')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Firemní profil se nepodařilo uložit.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="max-w-3xl rounded border border-slate-200 bg-white p-4">
      <div className="mb-4 text-sm font-semibold text-slate-900">Firma</div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">Povinné pro uložení</div>
            <div className="grid gap-3">
              <CompanyField label="Název" value={employer.name} onChange={value => updateField({ name: value })} />
              <CompanyField label="IČO" value={employer.ico} onChange={value => updateField({ ico: value })} />
              <CompanyField label="Sídlo" value={employer.seat} onChange={value => updateField({ seat: value })} />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">Povinné pro tisk smlouvy</div>
            <div className="grid gap-3">
              <CompanyField label="Jednající osoba" value={employer.representativeName} onChange={value => updateField({ representativeName: value })} />
              <CompanyField label="Funkce / jednání za zaměstnavatele" value={employer.representativeRole} onChange={value => updateField({ representativeRole: value })} />
            </div>
          </div>
          <div className="rounded border border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-600">
            Pro tisk pracovní smlouvy musí být vyplněno všech pět polí: název, IČO, sídlo, jednající osoba a funkce jednající osoby. Runtime store slouží jen jako cache nad JSON API.
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button className="border border-slate-300 px-3 py-1 text-[12px] text-slate-700 disabled:border-slate-200 disabled:text-slate-400" onClick={onSave} disabled={saving}>
          Uložit firemní profil
        </button>
        {info && <span className="text-green-700">{info}</span>}
        {error && <span className="text-red-700">{error}</span>}
      </div>
    </section>
  )
}
