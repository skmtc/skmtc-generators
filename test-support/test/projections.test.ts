/**
 * Each stock generator's entry lists the projection classes the generator can
 * insert (`projections`), so core can know before a run which files it can
 * write. A list is checked here across the workspace, because a list that
 * lacks a class still type-checks and still gives the same output.
 */
import { assertEquals } from '@std/assert'

type DenoJson = { workspace?: string[] }

const rootUrl = new URL('../../', import.meta.url)

const root: DenoJson = JSON.parse(Deno.readTextFileSync(new URL('deno.json', rootUrl)))

const generatorDirs = (root.workspace ?? [])
  .map(dir => dir.replace(/^\.\//, ''))
  .filter(dir => dir.startsWith('gen-'))

/** The stock generators with no list, each with its reason. */
const unlisted: Record<string, string> = {
  'gen-md-docs': 'the path of a document is an option that transform passes on the insert'
}

/** The `projections` of a package's default export, its entry. */
const toProjections = async (dir: string): Promise<unknown[]> => {
  const module: { default?: unknown } = await import(new URL(`${dir}/mod.ts`, rootUrl).href)
  const entry = module.default

  if (typeof entry !== 'object' || entry === null || !('projections' in entry)) {
    return []
  }

  return Array.isArray(entry.projections) ? entry.projections : []
}

/** The stock generators that `dir`'s source imports from, test files left out. */
const toImportedGenerators = (dir: string): string[] => {
  const srcUrl = new URL(`${dir}/src/`, rootUrl)

  const sources = [...Deno.readDirSync(srcUrl)]
    .filter(file => file.isFile && file.name.endsWith('.ts') && !file.name.endsWith('.test.ts'))
    .map(file => Deno.readTextFileSync(new URL(file.name, srcUrl)))

  const imported = sources.flatMap(source =>
    [...source.matchAll(/from ['"]@skmtc\/(gen-[a-z-]+)['"]/g)].map(match => match[1])
  )

  return [...new Set(imported)].filter(name => name !== dir).sort()
}

const projections = new Map<string, unknown[]>()

for (const dir of generatorDirs) {
  projections.set(dir, await toProjections(dir))
}

const toList = (dir: string): unknown[] => projections.get(dir) ?? []

Deno.test('every stock generator lists its projections, or is named here with its reason', () => {
  const withoutList = generatorDirs.filter(dir => toList(dir).length === 0)

  assertEquals(withoutList, Object.keys(unlisted))
})

// The trap: a generator inserts a projection of another generator, and that
// projection inserts one of a third. Only the other generator's own list knows
// the third, so a generator spreads the list of each generator it imports from.
Deno.test("a generator's list holds the list of each stock generator it imports from", () => {
  const missing = generatorDirs
    .filter(dir => !(dir in unlisted))
    .flatMap(dir =>
      toImportedGenerators(dir)
        .filter(imported => !toList(imported).every(item => toList(dir).includes(item)))
        .map(imported => `${dir} lacks the projections of ${imported}`)
    )

  assertEquals(missing, [])
})
