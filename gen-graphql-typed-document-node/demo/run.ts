import { StackTrail } from '@skmtc/core'
import { toArtifactsFromGraphQL } from '@skmtc/core/parsers/graphql'
import { toTypescriptEntry } from '@skmtc/gen-typescript'
import { graphqlOperationEntry } from '@skmtc/gen-graphql-operation'
import { graphqlTypedDocumentNodeEntry } from '../mod.ts'

const sdl = await Deno.readTextFile(new URL('./blog.graphql', import.meta.url))

console.log('━━━ Input schema ━━━')
console.log(sdl)

const result = toArtifactsFromGraphQL({
  traceId: 'gql-typed-doc-demo',
  spanId: 'run',
  startAt: Date.now(),
  source: sdl,
  settings: { basePath: './generated' },
  toGeneratorConfigMap: () => ({
    typescript: toTypescriptEntry({ scalars: { DateTime: 'string' } }),
    // gen-graphql-operation: emits per-operation Args + Result types.
    gqlOperation: graphqlOperationEntry,
    // gen-graphql-typed-document-node: adds the Document constant.
    gqlTypedDoc: graphqlTypedDocumentNodeEntry
  }),
  silent: true,
  stackTrail: new StackTrail(['gql-typed-doc-demo'])
})

console.log('\n━━━ Generated files ━━━')
const paths = Object.keys(result.artifacts).sort()
console.log(`Total: ${paths.length}`)
for (const path of paths) {
  console.log(`\n--- ${path} ---`)
  console.log(result.artifacts[path])
}

if (result.parseIssues.length > 0) {
  console.log(`\nParse issues (${result.parseIssues.length}):`)
  for (const issue of result.parseIssues) {
    console.log(`  [${issue.level}] ${issue.location}: ${issue.message}`)
  }
}
