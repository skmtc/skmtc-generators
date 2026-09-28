/**
 * Workspace invariants that per-generator tests cannot see, because every
 * test run resolves the workspace's single copy of core.
 *
 * #48: the published generators pinned an older `@skmtc/core` than the CLI
 * installs, so a user's bundle held two copies of core, the engine's
 * `instanceof` checks failed across them, and every file came out empty
 * with exit 0. The pins had drifted apart one package at a time. These tests
 * fail the moment one pin moves without the others.
 */
import { assert, assertEquals } from '@std/assert'
import { parse } from '@std/yaml'

type DenoJson = {
  name?: string
  version?: string
  imports?: Record<string, string>
  workspace?: string[]
  lint?: { plugins?: string[] }
}

const rootUrl = new URL('../../', import.meta.url)

const readJson = <T>(path: string): T => JSON.parse(Deno.readTextFileSync(new URL(path, rootUrl)))

const root = readJson<DenoJson>('deno.json')

const members = (root.workspace ?? []).map(dir => {
  const path = dir.replace(/^\.\//, '')
  return { dir: path, config: readJson<DenoJson>(`${path}/deno.json`) }
})

/** The version in a `jsr:@scope/name@version[/sub]` specifier. */
const toPinnedVersion = (specifier: string): string | undefined =>
  specifier.match(/^jsr:@[^/]+\/[^@]+@([^/]+)/)?.[1]

/** Every member's pin of `name`, as `{ dir: version }`. */
const toMemberPins = (name: string): Record<string, string | undefined> =>
  Object.fromEntries(
    members
      .filter(({ config }) => config.imports?.[name])
      .map(({ dir, config }) => [dir, toPinnedVersion(config.imports?.[name] ?? '')])
  )

Deno.test('workspace - every member pins @skmtc/core at the root pin', () => {
  const rootPin = toPinnedVersion(root.imports?.['@skmtc/core'] ?? '')
  assert(rootPin, 'the root import map must pin @skmtc/core')

  const pins = toMemberPins('@skmtc/core')

  assertEquals(
    Object.entries(pins).filter(([, version]) => version !== rootPin),
    [],
    `every @skmtc/core pin must be ${rootPin}`
  )
})

for (const name of ['@skmtc/lang-typescript', '@skmtc/lang-kotlin']) {
  Deno.test(`workspace - every member pins the same ${name}`, () => {
    const versions = new Set(Object.values(toMemberPins(name)))

    assertEquals(versions.size, 1, `${name} pins disagree: ${JSON.stringify(toMemberPins(name))}`)
  })
}

Deno.test('workspace - every member declares the root lint plugins', () => {
  // #56: gen-fetch-example had no `lint` block, so its clones got no
  // `skmtc/*` rules. A member that spells the plugin differently from the
  // root makes `deno lint` fail with "Linter plugin skmtc has already been
  // registered", so the specifiers must match exactly.
  const rootPlugins = root.lint?.plugins ?? []
  assert(rootPlugins.length > 0, 'the root deno.json must declare lint plugins')

  assertEquals(
    members
      .filter(({ config }) => JSON.stringify(config.lint?.plugins) !== JSON.stringify(rootPlugins))
      .map(({ dir, config }) => `${dir}: ${JSON.stringify(config.lint?.plugins ?? null)}`),
    [],
    `every member's lint.plugins must be ${JSON.stringify(rootPlugins)}`
  )
})

Deno.test('workspace - a pin on another workspace generator names its current version', () => {
  // A pin that misses the member's version resolves from jsr.io instead, and
  // brings that release's own core pin with it.
  const versions = new Map(members.map(({ config }) => [config.name, config.version]))

  const stale = members.flatMap(({ dir, config }) =>
    Object.entries(config.imports ?? {})
      .filter(([name, specifier]) => versions.has(name) && specifier.startsWith('jsr:'))
      .filter(([name, specifier]) => toPinnedVersion(specifier) !== versions.get(name))
      .map(([name, specifier]) => `${dir}: ${specifier} (workspace has ${versions.get(name)})`)
  )

  assertEquals(stale, [])
})

Deno.test('workspace - the lockfile resolves exactly one @skmtc/core', () => {
  const lock = readJson<{ jsr?: Record<string, unknown> }>('deno.lock')

  const cores = Object.keys(lock.jsr ?? {}).filter(key => key.startsWith('@skmtc/core@'))

  assertEquals(cores, [`@skmtc/core@${toPinnedVersion(root.imports?.['@skmtc/core'] ?? '')}`])
})

Deno.test('workspace - no generator source imports an OS-aware path module', () => {
  // An export path is `@/` plus a forward-slash path on every host. `join`
  // from @std/path or node:path spells it with `\` on Windows.
  const offenders: string[] = []

  const walk = (url: URL) => {
    for (const entry of Deno.readDirSync(url)) {
      const child = new URL(entry.isDirectory ? `${entry.name}/` : entry.name, url)

      if (entry.isDirectory) {
        walk(child)
      } else if (/\.tsx?$/.test(entry.name)) {
        const text = Deno.readTextFileSync(child)

        if (/from ['"](@std\/path[^'"]*|jsr:@std\/path[^'"]*|node:path)['"]/.test(text)) {
          offenders.push(child.pathname.slice(rootUrl.pathname.length))
        }
      }
    }
  }

  for (const { dir } of members.filter(({ dir }) => dir.startsWith('gen-'))) {
    walk(new URL(`${dir}/src/`, rootUrl))
  }

  assertEquals(offenders, [])
})

type Mapping = Record<string, unknown>

const isMapping = (value: unknown): value is Mapping =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** `value` narrowed to a mapping, or a failure naming where it was expected. */
const toMapping = (value: unknown, where: string): Mapping => {
  assert(isMapping(value), `${where} must be a mapping`)
  return value
}

const workflow = toMapping(
  parse(Deno.readTextFileSync(new URL('.github/workflows/tests-coverage.yml', rootUrl))),
  'tests-coverage.yml'
)

const toJob = (name: string): Mapping => toMapping(toMapping(workflow.jobs, 'jobs')[name], `jobs.${name}`)

/** The job's matrix, which must hold `generator` and nothing else: an
 *  `include` or `exclude` would change what runs without touching the list. */
const toMatrix = (name: string): string[] => {
  const matrix = toMapping(toMapping(toJob(name).strategy, `${name}.strategy`).matrix, `${name}.strategy.matrix`)

  assertEquals(Object.keys(matrix), ['generator'], `${name}.strategy.matrix must hold only generator`)

  const { generator } = matrix
  assert(
    Array.isArray(generator) && generator.every(item => typeof item === 'string'),
    `${name}.strategy.matrix.generator must be a list of names`
  )

  return generator
}

/** Conditions that would let a matrix entry skip or ignore its tests. */
const toSkips = (name: string): string[] => {
  const job = toJob(name)

  const steps = job.steps
  assert(Array.isArray(steps), `${name}.steps must be a list`)

  const testSteps = steps
    .map((step, index) => toMapping(step, `${name}.steps[${index}]`))
    .filter(({ run }) => typeof run === 'string' && /^deno task test(:coverage)?$/.test(run.trim()))

  assertEquals(testSteps.length, 1, `${name} must have one step that runs the test task`)

  return [job, ...testSteps].flatMap(entry =>
    ['if', 'continue-on-error'].filter(key => key in entry).map(key => `${name}: ${key}: ${entry[key]}`)
  )
}

Deno.test('workspace - the Linux and Windows test matrices both list every member', () => {
  // #50: members added to the coverage matrix got no Windows run, so their
  // forward-slash export paths were never checked where `\` is the separator.
  const coverage = toMatrix('coverage')
  const windows = toMatrix('tests-windows')

  assertEquals(windows, coverage)
  assertEquals([...coverage].sort(), members.map(({ dir }) => dir).sort())
})

Deno.test('workspace - every matrix entry runs its tests unconditionally', () => {
  assertEquals([...toSkips('coverage'), ...toSkips('tests-windows')], [])
})

/** Each trigger's `paths-ignore`, as `{ event: patterns }`, for the events
 *  in `events`. A missing trigger or filter shows as `null`. */
const toPathsIgnore = (file: string, events: string[]): Record<string, unknown> => {
  const on = toMapping(
    toMapping(parse(Deno.readTextFileSync(new URL(`.github/workflows/${file}`, rootUrl))), file).on,
    `${file}: on`
  )

  return Object.fromEntries(
    events.map(event => [event, isMapping(on[event]) ? on[event]['paths-ignore'] ?? null : null])
  )
}

Deno.test('workspace - retro-only changes start no test or publish run', () => {
  // #61: every delivery ends with a push that adds only retros/<file>.md.
  // Ignoring anything wider would let a code change skip its tests.
  assertEquals(toPathsIgnore('tests-coverage.yml', ['push', 'pull_request']), {
    push: ['retros/**'],
    pull_request: ['retros/**']
  })
  assertEquals(toPathsIgnore('publish.yml', ['push']), { push: ['retros/**'] })
})
