import { useEffect } from 'react'
import { loadCompanyProfile } from '../infrastructure/api/monthStorage'
import { useStore } from '../infrastructure/state/store'

export function useAppShell() {
  const section = useStore(s => s.section)
  const setSection = useStore(s => s.setSection)
  const setEmployer = useStore(s => s.setEmployer)
  const activeSection: 'employees' | 'holidays' | 'company' = section === 'holidays' || section === 'company' ? section : 'employees'

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
    section: activeSection,
    navigationItems: [
      { key: 'employees', label: 'Zaměstnanci' },
      { key: 'holidays', label: 'Svátky' },
      { key: 'company', label: 'Firma' },
    ] as const,
    onSelectSection: setSection,
  }
}
