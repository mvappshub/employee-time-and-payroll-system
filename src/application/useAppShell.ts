import { useStore } from '../infrastructure/state/store'

export function useAppShell() {
  const section = useStore(s => s.section)
  const setSection = useStore(s => s.setSection)

  return {
    section,
    navigationItems: [
      { key: 'employee', label: 'Zaměstnanec' },
      { key: 'timesheet', label: 'Evidence' },
      { key: 'payslip', label: 'Výplatní páska' },
      { key: 'holidays', label: 'Svátky' },
    ] as const,
    onSelectSection: setSection,
  }
}
