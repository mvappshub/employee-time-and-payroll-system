import { useEffect, useState } from 'react'
import { loadCompanyProfile, saveCompanyProfile } from '../../infrastructure/api/monthStorage'
import { useStore } from '../../infrastructure/state/store'
import type { EmployerProfile } from '../../domain/shared/types'

const inp = 'min-h-7 w-full border border-[#1f2937] bg-white px-2 py-1 text-[12px] text-black outline-none'

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
      <span className="mb-[2px] text-[12px] font-bold text-black">{label}</span>
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
    <section className="max-w-4xl border-2 border-black bg-white p-2">
      <div className="mb-2 border-2 border-black bg-black px-2 py-1 text-sm font-extrabold text-white">Firma</div>
      <div className="grid gap-2 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="border border-black p-2">
            <div className="mb-2 text-[12px] font-extrabold text-black">Povinné pro uložení</div>
            <div className="grid gap-2">
              <CompanyField label="Název" value={employer.name} onChange={value => updateField({ name: value })} />
              <CompanyField label="IČO" value={employer.ico} onChange={value => updateField({ ico: value })} />
              <CompanyField label="Sídlo" value={employer.seat} onChange={value => updateField({ seat: value })} />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="border border-black p-2">
            <div className="mb-2 text-[12px] font-extrabold text-black">Povinné pro tisk smlouvy</div>
            <div className="grid gap-2">
              <CompanyField label="Jednající osoba" value={employer.representativeName} onChange={value => updateField({ representativeName: value })} />
              <CompanyField label="Funkce / jednání za zaměstnavatele" value={employer.representativeRole} onChange={value => updateField({ representativeRole: value })} />
            </div>
          </div>
          <div className="border border-black bg-[#f3f4f6] p-2 text-[12px] text-[#4b5563]">
            Pro tisk pracovní smlouvy musí být vyplněno všech pět polí: název, IČO, sídlo, jednající osoba a funkce jednající osoby. Runtime store slouží jen jako cache nad JSON API.
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-2">
        <button className="border border-black bg-[#2563eb] px-3 py-1 text-[12px] font-extrabold text-white disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500" onClick={onSave} disabled={saving}>
          Uložit firemní profil
        </button>
      </div>
      {info && <div className="mt-2 border border-black bg-[#f3f4f6] px-2 py-1 text-[12px] text-[#4b5563]">{info}</div>}
      {error && <div className="mt-2 border border-black bg-[#fecaca] px-2 py-1 text-[12px] font-bold text-black">{error}</div>}
    </section>
  )
}
