import { useStore } from '../infrastructure/state/store'

export function useAppShell() {
  const section = useStore(s => s.section)
  const setSection = useStore(s => s.setSection)

  return {
    section,
    navigationItems: [
      { key: 'employee', label: 'Zaměstnanec' },
      { key: 'timesheet', label: 'Evidence' },
      { key: 'month-close', label: 'Měsíční uzávěrka' },
      { key: 'payslip', label: 'Výplatní páska' },
      { key: 'payroll-sheet', label: 'Mzdový list' },
      { key: 'legal-constants', label: 'Zákonné konstanty' },
      { key: 'holidays', label: 'Svátky' },
    ] as const,
    onSelectSection: setSection,
  }
}
