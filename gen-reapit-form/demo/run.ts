/**
 * Local test driver for gen-reapit-form.
 *
 * Bypasses the interactive CLI: feeds an SDL through `toArtifacts` and
 * prints every generated file. Useful for inspecting output while
 * iterating on the form emitter or field DSL.
 *
 * Run from this directory:
 *   deno run --allow-read --allow-env demo/run.ts
 */
import { StackTrail, toArtifacts } from '@skmtc/core'
import { toTypescriptEntry } from '@skmtc/gen-typescript'
import zodEntry from '@skmtc/gen-zod'
import { reapitFormEntry } from '../mod.ts'

const sdl = await Deno.readTextFile(new URL('./blog.graphql', import.meta.url))

console.log('━━━ Input schema ━━━')
console.log(sdl)

const result = toArtifacts({
  traceId: 'reapit-form-demo',
  spanId: 'run',
  startAt: Date.now(),
  document: { type: 'gql', value: sdl },
  settings: { basePath: './generated' },
  toGeneratorConfigMap: () => ({
    // @ts-expect-error - factory-emitted transform is monomorphic over Acc
    typescript: toTypescriptEntry({ scalars: { DateTime: 'string' } }),
    // @ts-expect-error - factory-emitted transform is monomorphic over Acc
    zod: zodEntry,
    // @ts-expect-error - factory-emitted transform is monomorphic over Acc
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
