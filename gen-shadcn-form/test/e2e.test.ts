/**
 * A full Parse → Generate → Render run over a shared fixture. Artifact keys and
 * import text are where a host-specific path separator shows (an OS-aware
 * `join` spelled `@/types/x.ts` as `@\types\x.ts` on Windows), so they are
 * pinned here and run on both the Linux and the Windows runner.
 */
import { assertEquals, assertStringIncludes } from '@std/assert'
import { operationDocument, runE2eFixture } from '@skmtc/test-support'
import type { OpenAPIV3 } from 'openapi-types'
import { ShadcnFormEntry } from '../src/mod.ts'

const { artifacts } = runE2eFixture({
  id: '@skmtc/gen-shadcn-form',
  entry: ShadcnFormEntry,
  document: operationDocument
})

Deno.test('e2e - artifact keys are forward-slash paths under basePath', () => {
  assertEquals(Object.keys(artifacts).sort(), [
    'src/demo.tsx',
    'src/forms/CreateUsersForm.generated.tsx',
    'src/services/useCreateApiUsers.generated.ts',
    'src/types/newUser.generated.ts',
    'src/types/user.generated.ts'
  ])
})

Deno.test('e2e - generated imports name workspace paths with forward slashes', () => {
  assertStringIncludes(
    artifacts['src/demo.tsx'],
    `import {CreateUsersForm} from '@/forms/CreateUsersForm.generated.tsx'`
  )
})

// The trap: a header written into quotes by hand ends at its own quote
// (`Partner's`), and a column without `x-label` showed the text 'undefined'.
Deno.test('e2e - table headers are escaped, and fall back to the property name', () => {
  const labelled: OpenAPIV3.NonArraySchemaObject & { 'x-label': string } = {
    type: 'string',
    'x-label': "Partner's name"
  }
  const rows: OpenAPIV3.SchemaObject = {
    type: 'array',
    items: { type: 'object', properties: { name: labelled, size: { type: 'number' } } }
  }
  const document: OpenAPIV3.Document = {
    ...operationDocument,
    components: {
      schemas: { ...operationDocument.components?.schemas, NewUser: { type: 'object', properties: { rows } } }
    }
  }

  const { artifacts: tableArtifacts } = runE2eFixture({ id: '@skmtc/gen-shadcn-form', entry: ShadcnFormEntry, document })

  assertStringIncludes(
    tableArtifacts['src/forms/CreateUsersForm.generated.tsx'],
    "headers={['Partner\\'s name', 'size']}"
  )
})
