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

type DenoJson = {
  name?: string
  version?: string
  imports?: Record<string, string>
  workspace?: string[]
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
