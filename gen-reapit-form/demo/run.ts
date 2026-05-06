/**
 * Local test driver for gen-reapit-form.
 *
 * Bypasses the interactive CLI: feeds an SDL through
 * `toArtifactsFromGraphQL` and prints every generated file. Useful for
 * inspecting output while iterating on the form emitter or field DSL.
 *
 * Run from this directory:
 *   deno run --allow-read --allow-env demo/run.ts
 */
import { StackTrail } from '@skmtc/core'
import { toArtifactsFromGraphQL } from '@skmtc/core/parsers/graphql'
import { toTypescriptEntry } from '@skmtc/gen-typescript'
import zodEntry from '@skmtc/gen-zod'
import { reapitFormEntry } from '../mod.ts'

const sdl = await Deno.readTextFile(new URL('./blog.graphql', import.meta.url))

console.log('━━━ Input schema ━━━')
console.log(sdl)

const result = toArtifactsFromGraphQL({
  traceId: 'reapit-form-demo',
  spanId: 'run',
  startAt: Date.now(),
  source: sdl,
  settings: { basePath: './generated' },
  toGeneratorConfigMap: () => ({
    typescript: toTypescriptEntry({ scalars: { DateTime: 'string' } }),
    zod: zodEntry,
    reapitForm: reapitFormEntry
  }),
  silent: true,
  stackTrail: new StackTrail(['reapit-form-demo'])
})

console.log('\n━━━ Generated files ━━━')
const paths = Object.keys(result.artifacts).sort()
console.log(`Total: ${paths.length}`)
for (const path of paths) {
  console.log(`\n--- ${path} ---`)
  console.log(result.artifacts[path])
}
