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
 * Reads each named property as its own type, and parses every case of
 * `additionalPropertiesCases`. Loading it throws on the first case valibot
 * gets wrong.
 */
const additionalPropertiesConsumer = `import * as v from 'valibot'
import { upload } from '@/types/upload.generated.ts'
import { limits } from '@/types/limits.generated.ts'
import { dotted } from '@/types/dotted.generated.ts'

export const readUpload = (value: v.InferOutput<typeof upload>): string[] => [value.app_id, ...value.images]
export const readLimits = (value: v.InferOutput<typeof limits>): [string, string | undefined] => [value.id, value.note]
export const readDotted = (value: v.InferOutput<typeof dotted>): string => value['a.b']

const accepts: Record<string, (value: unknown) => boolean> = {
  Upload: value => v.safeParse(upload, value).success,
  Limits: value => v.safeParse(limits, value).success,
  Dotted: value => v.safeParse(dotted, value).success
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
