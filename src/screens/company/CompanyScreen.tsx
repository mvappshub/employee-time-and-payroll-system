import { useEffect, useState } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { useStore } from '../../infrastructure/state/store'
import { loadCompanyProfile, saveCompanyProfile } from '../../infrastructure/api/monthStorage'
import type { EmployerProfile } from '../../domain/shared/types'

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
    <section className="max-w-3xl space-y-3">
      <PageHeader title="Firemní profil" description="Údaje o zaměstnavateli pro pracovní smlouvy a dokumenty" />
      <Card>
        <CardHeader><CardTitle>Základní údaje</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Název" value={employer.name} onChange={e => updateField({ name: e.target.value })} />
            <Input label="IČO" value={employer.ico} onChange={e => updateField({ ico: e.target.value })} />
            <Input className="md:col-span-2" label="Sídlo" value={employer.seat} onChange={e => updateField({ seat: e.target.value })} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Zastupování</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Jednající osoba" value={employer.representativeName} onChange={e => updateField({ representativeName: e.target.value })} />
            <Input label="Funkce / jednání za zaměstnavatele" value={employer.representativeRole} onChange={e => updateField({ representativeRole: e.target.value })} />
          </div>
        </CardContent>
      </Card>
      <Alert tone="info">Pro tisk pracovní smlouvy musí být vyplněno všech pět polí.</Alert>
      {info && <Alert tone="success">{info}</Alert>}
      {error && <Alert tone="danger">{error}</Alert>}
      <div className="sticky bottom-2 z-10 flex items-center justify-end rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-md backdrop-blur">
        <Button variant="primary" size="sm" onClick={onSave} disabled={saving}>
          Uložit firemní profil
        </Button>
      </div>
    </section>
  )
}
