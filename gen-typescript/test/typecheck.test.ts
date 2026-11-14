/**
 * The ground-truth gate for open objects (named properties plus
 * `additionalProperties`): emit them, then type-check a consumer that reads
 * and builds them. A pinned string is just as happy to pin a type that
 * compiles but reads every property as `unknown`.
 *
 * Opt-in (`deno task test:typecheck`) because it needs write/run/net, which
 * the default test task does not grant.
 */
import { assertEquals } from '@std/assert'
import { checkGenerated, runE2eFixture } from '@skmtc/test-support'
import type { OpenAPIV3 } from 'openapi-types'
import { typescriptEntry } from '../src/mod.ts'

const openObjectDocument: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'Open objects', version: '1.0.0' },
  paths: {},
  components: {
    schemas: {
      // Sentry's snapshot upload body: any extra key, of any type.
      Upload: {
        type: 'object',
        properties: {
          app_id: { type: 'string' },
          images: { type: 'array', items: { type: 'string' } }
        },
        required: ['app_id', 'images'],
        additionalProperties: true
      },
      // A typed record beside properties of other types, one optional.
      Limits: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          note: { type: 'string', nullable: true }
        },
        required: ['name'],
        additionalProperties: { type: 'number' }
      },
      // A model that holds itself in its record, beside a named property.
      Tree: {
        type: 'object',
        properties: {
          label: { type: 'string' }
        },
        required: ['label'],
        additionalProperties: { $ref: '#/components/schemas/Tree' }
      }
    }
  }
}

// The trap: `{app_id: string, …} | {[key: string]: unknown}` compiles on its
// own. Only a consumer that reads `upload.app_id` sees `unknown`.
const consumer = `import type {Upload} from '@/types/upload.generated.ts'
import type {Limits} from '@/types/limits.generated.ts'
import type {Tree} from '@/types/tree.generated.ts'

export const readUpload = (upload: Upload): string[] => [upload.app_id, ...upload.images]

export const readLimits = (limits: Limits): [string, string | null | undefined] => [limits.name, limits.note]

export const readTree = (tree: Tree): string => tree.label

export const upload: Upload = {app_id: 'app', images: [], extra: {any: 'value'}}

export const limits: Limits = {name: 'api', note: null, perMinute: 60}

export const tree: Tree = {label: 'root', left: {label: 'leaf'}}
`

Deno.test({
  name: 'typecheck - a consumer reads and builds every open object as its own type',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: '@skmtc/gen-typescript',
      entry: typescriptEntry,
      document: openObjectDocument
    })

    // A failed run renders no files, and nothing then fails the check.
    assertEquals(Object.keys(artifacts).sort(), [
      'src/types/limits.generated.ts',
      'src/types/tree.generated.ts',
      'src/types/upload.generated.ts'
    ])

    assertEquals(
      await checkGenerated({ artifacts: { ...artifacts, 'src/consumer.ts': consumer }, imports: {} }),
      []
    )
  }
})
