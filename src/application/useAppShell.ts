import { useEffect } from 'react'
import { loadCompanyProfile } from '../infrastructure/api/monthStorage'
import { useStore } from '../infrastructure/state/store'

export function useAppShell() {
  const section = useStore(s => s.section)
  const setSection = useStore(s => s.setSection)
  const setEmployer = useStore(s => s.setEmployer)

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

  return {
    section,
    mainItems: [
      { key: 'employees', label: 'Zaměstnanci' },
      { key: 'time-tracking', label: 'Evidence pracovní doby' },
      { key: 'payroll', label: 'Mzdy' },
    ] as const,
    bottomItems: [
      { key: 'company', label: 'Firma' },
      { key: 'holidays', label: 'Svátky' },
    ] as const,
    onSelectSection: setSection,
  }
}
