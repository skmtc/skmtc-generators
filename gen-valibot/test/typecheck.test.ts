/**
 * The ground-truth gate for cycles: emit every recursive shape, compile it
 * against valibot, and load each file first. A pinned string is just as
 * happy to pin output that cannot type-check or that throws when its module
 * loads.
 *
 * Opt-in (`deno task test:typecheck`) because it needs write/run/net, which
 * the default test task does not grant.
 */
import { assertEquals } from '@std/assert'
import {
  additionalPropertiesCases,
  additionalPropertiesDocument,
  checkGenerated,
  cycleDocument,
  runE2eFixture,
  unionDocument
} from '@skmtc/test-support'
import { valibotEntry } from '../src/mod.ts'

/** The valibot the output is checked against, the workspace's pin. */
const VALIBOT = 'npm:valibot@1.1.0'

/**
 * Checks that each named property infers as exactly its own type, and
 * parses every case of `additionalPropertiesCases`. Loading it throws on
 * the first case valibot gets wrong.
 *
 * The trap: an assignment such as `const id: string = value.id` also
 * compiles when `id` is `never` or `any`, so `Equals` compares the types
 * both ways.
 */
const additionalPropertiesConsumer = `import * as v from 'valibot'
import { upload } from '@/types/upload.generated.ts'
import { limits } from '@/types/limits.generated.ts'
import { dotted } from '@/types/dotted.generated.ts'
import { tree } from '@/types/tree.generated.ts'

type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false

export const uploadAppId: Equals<v.InferOutput<typeof upload>['app_id'], string> = true
export const uploadImages: Equals<v.InferOutput<typeof upload>['images'], string[]> = true
export const limitsId: Equals<v.InferOutput<typeof limits>['id'], string> = true
export const limitsNote: Equals<v.InferOutput<typeof limits>['note'], string | undefined> = true
export const dottedKey: Equals<v.InferOutput<typeof dotted>['a.b'], string> = true
export const treeLabel: Equals<v.InferOutput<typeof tree>['label'], string> = true

const accepts: Record<string, (value: unknown) => boolean> = {
  Upload: value => v.safeParse(upload, value).success,
  Limits: value => v.safeParse(limits, value).success,
  Dotted: value => v.safeParse(dotted, value).success,
  Tree: value => v.safeParse(tree, value).success
}

for (const check of ${JSON.stringify(additionalPropertiesCases)}) {
  const accepted = accepts[check.model](check.value)
  if (accepted !== check.accept) {
    throw new Error(\`\${check.model}, \${check.name}: accepted is \${accepted}\`)
  }
}
`

Deno.test({
  name: 'typecheck - every model of a cycle compiles against valibot and loads first',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: '@skmtc/gen-valibot',
      entry: valibotEntry,
      document: cycleDocument
    })

    // A failed run renders no files, and nothing then fails the check.
    assertEquals(Object.keys(artifacts).length, 11)

    assertEquals(await checkGenerated({ artifacts, imports: { valibot: VALIBOT } }), [])
  }
})

Deno.test({
  name: 'typecheck - every discriminated union compiles against valibot and loads first',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: '@skmtc/gen-valibot',
      entry: valibotEntry,
      document: unionDocument
    })

    assertEquals(Object.keys(artifacts).length, 15)

    assertEquals(await checkGenerated({ artifacts, imports: { valibot: VALIBOT } }), [])
  }
})

// The trap: `v.intersect` with `v.record` compiles and accepts
// `additionalProperties: true`, but checks a typed record against the named
// keys too, so valibot rejects `{id: 'x', count: 1}` (#101).
Deno.test({
  name: 'typecheck - a record beside properties checks only the other keys',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: '@skmtc/gen-valibot',
      entry: valibotEntry,
      document: additionalPropertiesDocument
    })

    assertEquals(Object.keys(artifacts).sort(), [
      'src/types/dotted.generated.ts',
      'src/types/limits.generated.ts',
      'src/types/tree.generated.ts',
      'src/types/upload.generated.ts'
    ])

    assertEquals(
      await checkGenerated({
        artifacts: { ...artifacts, 'src/consumer.ts': additionalPropertiesConsumer },
        imports: { valibot: VALIBOT }
      }),
      []
    )
  }
})
