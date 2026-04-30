import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

type Layer = 'domain' | 'application' | 'infrastructure' | 'screens' | 'app' | 'other'

const srcRoot = path.resolve(process.cwd(), 'src')
const importPattern = /import\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g
const allowedBoundaryViolations = [
  'application/autosaveMonth.ts -> infrastructure/api/monthStorage.ts',
  'application/useAppShell.ts -> infrastructure/api/monthStorage.ts',
  'application/useAppShell.ts -> infrastructure/state/store.ts',
  'application/useEmployeeScreen.ts -> infrastructure/state/store.ts',
  'application/useEmployeesScreen.ts -> infrastructure/api/monthStorage.ts',
  'application/useEmployeesScreen.ts -> infrastructure/state/store.ts',
  'application/useHolidaysScreen.ts -> infrastructure/state/store.ts',
  'application/useMonthControls.ts -> infrastructure/api/monthStorage.ts',
  'application/useMonthControls.ts -> infrastructure/state/store.ts',
  'application/usePaySlipScreen.ts -> infrastructure/api/monthStorage.ts',
  'application/usePaySlipScreen.ts -> infrastructure/state/store.ts',
  'application/useTimeSheetScreen.ts -> infrastructure/api/monthStorage.ts',
  'application/useTimeSheetScreen.ts -> infrastructure/state/store.ts',
]

function layerOf(filePath: string): Layer {
  const relative = path.relative(srcRoot, filePath).replaceAll(path.sep, '/')
  const [first, second] = relative.split('/')
  if (first === 'domain') return 'domain'
  if (first === 'application') return 'application'
  if (first === 'infrastructure') return 'infrastructure'
  if (first === 'screens') return second === 'views' ? 'screens' : 'screens'
  if (first === 'app') return 'app'
  return 'other'
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    const filePath = path.join(dir, entry)
    const stat = statSync(filePath)
    if (stat.isDirectory()) return sourceFiles(filePath)
    return /\.(ts|tsx)$/.test(entry) ? [filePath] : []
  })
}

function resolveRelativeImport(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null
  const base = path.resolve(path.dirname(fromFile), specifier)
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ]
  return candidates.find(candidate => existsSync(candidate)) ?? null
}

function findBoundaryViolations() {
  const violations: string[] = []

  for (const filePath of sourceFiles(srcRoot)) {
    if (filePath.endsWith('.test.ts') || filePath.endsWith('.test.tsx')) continue

    const sourceLayer = layerOf(filePath)
    const source = readFileSync(filePath, 'utf8')

    for (const match of source.matchAll(importPattern)) {
      const targetPath = resolveRelativeImport(filePath, match[1])
      if (!targetPath) continue

      const targetLayer = layerOf(targetPath)
      const relativeSource = path.relative(srcRoot, filePath).replaceAll(path.sep, '/')
      const relativeTarget = path.relative(srcRoot, targetPath).replaceAll(path.sep, '/')

      if (sourceLayer === 'domain' && ['application', 'infrastructure', 'screens', 'app'].includes(targetLayer)) {
        violations.push(`${relativeSource} -> ${relativeTarget}`)
      }
      if (sourceLayer === 'application' && ['infrastructure', 'screens', 'app'].includes(targetLayer)) {
        violations.push(`${relativeSource} -> ${relativeTarget}`)
      }
      if (sourceLayer === 'infrastructure' && ['application', 'screens'].includes(targetLayer)) {
        violations.push(`${relativeSource} -> ${relativeTarget}`)
      }
    }
  }

  return violations.sort()
}

describe('import boundaries', () => {
  it('does not add new cross-layer imports beyond the current allowlist', () => {
    const violations = findBoundaryViolations()

    expect(violations).toEqual(allowedBoundaryViolations)
  })

  it('keeps the cleaned P0 boundary directions closed', () => {
    const violations = findBoundaryViolations()
    const p0Regressions = violations.filter(violation =>
      violation.startsWith('domain/') && violation.includes(' -> infrastructure/') ||
      violation.startsWith('infrastructure/') && violation.includes(' -> application/'),
    )

    expect(p0Regressions).toEqual([])
  })
})
