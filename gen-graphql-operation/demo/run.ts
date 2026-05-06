import { StackTrail } from '@skmtc/core'
import { toArtifactsFromGraphQL } from '@skmtc/core/parsers/graphql'
import { toTypescriptEntry } from '@skmtc/gen-typescript'
import { graphqlOperationEntry } from '../mod.ts'

const sdl = await Deno.readTextFile(new URL('./blog.graphql', import.meta.url))

console.log('━━━ Input schema ━━━')
console.log(sdl)

const result = toArtifactsFromGraphQL({
  traceId: 'gql-demo',
  spanId: 'run',
  startAt: Date.now(),
  source: sdl,
  settings: { basePath: './generated' },
  toGeneratorConfigMap: () => ({
    // gen-typescript with a custom scalar mapping for DateTime so it
    // emits `string` instead of the default fallback `unknown`.
    typescript: toTypescriptEntry({ scalars: { DateTime: 'string' } }),
    // gen-graphql-operation: per-root-field args/result types.
    gqlOperation: graphqlOperationEntry
  }),
  silent: true,
  stackTrail: new StackTrail(['gql-demo'])
})

console.log('\n━━━ Generated files ━━━')
const paths = Object.keys(result.artifacts).sort()
console.log(`Total: ${paths.length}`)
for (const path of paths) {
  console.log(`\n--- ${path} ---`)
  console.log(result.artifacts[path])
}

console.log('\n━━━ Manifest summary ━━━')
console.log(`Files registered: ${Object.keys(result.manifest.files).length}`)
console.log(`Generation took: ${result.manifest.endAt - result.manifest.startAt}ms`)

if (result.parseIssues.length > 0) {
  console.log(`\n━━━ Parse issues (${result.parseIssues.length}) ━━━`)
  for (const issue of result.parseIssues) {
    console.log(`[${issue.level}] ${issue.location}: ${issue.message} (${issue.type})`)
  }
} else {
  console.log('\nNo parse issues recorded.')
}
