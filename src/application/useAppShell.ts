import { useStore } from '../infrastructure/state/store'

export function useAppShell() {
  const section = useStore(s => s.section)
  const setSection = useStore(s => s.setSection)

  return {
    section,
    navigationItems: [
      { key: 'employees', label: 'Zaměstnanci' },
      { key: 'timesheet', label: 'Evidence' },
      { key: 'payroll', label: 'Mzda / Výplatní páska' },
      { key: 'holidays', label: 'Svátky' },
      { key: 'company', label: 'Firma' },
    ] as const,
    onSelectSection: setSection,
  }
}
