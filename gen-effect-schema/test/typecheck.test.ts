/**
 * The ground-truth gate for cycles: emit every recursive shape, compile it
 * against Effect, and load each file first, the barrel included. A pinned
 * string is just as happy to pin output that cannot type-check or that
 * throws when its module loads.
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
} from '@skmtc/test-support'
import { effectSchemaEntry } from '../src/mod.ts'

/** The Effect the output is checked against: `Schema.Codec` is Effect 4. */
const EFFECT = 'npm:effect@4.1.4'

/**
 * Reads each named property as its own type, and checks every case of
 * `additionalPropertiesCases`. Loading it throws on the first case Effect
 * gets wrong.
 */
const additionalPropertiesConsumer = `import { Schema } from 'effect'
import { Upload } from '@/schema-effect/upload.generated.ts'
import { Limits } from '@/schema-effect/limits.generated.ts'
import { Dotted } from '@/schema-effect/dotted.generated.ts'

export const readUpload = (value: typeof Upload.Type): string[] => [value.app_id, ...value.images]
export const readLimits = (value: typeof Limits.Type): [string, string | undefined] => [value.id, value.note]
export const readDotted = (value: typeof Dotted.Type): string => value['a.b']

const accepts: Record<string, (value: unknown) => boolean> = {
  Upload: Schema.is(Upload),
  Limits: Schema.is(Limits),
  Dotted: Schema.is(Dotted),
}

for (const check of ${JSON.stringify(additionalPropertiesCases)}) {
  const accepted = accepts[check.model](check.value)
  if (accepted !== check.accept) {
    throw new Error(\`\${check.model}, \${check.name}: accepted is \${accepted}\`)
  }
}
`

Deno.test({
  name: 'typecheck - every model of a cycle compiles against Effect and loads first',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: '@skmtc/gen-effect-schema',
      entry: effectSchemaEntry,
      document: cycleDocument,
    })

    // A failed run renders no files, and nothing then fails the check. Each
    // model has a schema, the barrel one more file, and the models of a
    // cycle a gen-typescript type each.
    assertEquals(Object.keys(artifacts).length, 22)

    assertEquals(
      await checkGenerated({ artifacts, imports: { effect: EFFECT } }),
      [],
    )
  },
})

// The trap: `Schema.Record(Schema.String, …)` beside a struct compiles and
// accepts `additionalProperties: true`, but checks a typed record against
// the named keys too, so Effect rejects `{id: 'x', count: 1}` (#101).
Deno.test({
  name: 'typecheck - a record beside properties checks only the other keys',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: '@skmtc/gen-effect-schema',
      entry: effectSchemaEntry,
      document: additionalPropertiesDocument,
    })

    assertEquals(Object.keys(artifacts).sort(), [
      'src/schema-effect/dotted.generated.ts',
      'src/schema-effect/index.generated.ts',
      'src/schema-effect/limits.generated.ts',
      'src/schema-effect/upload.generated.ts',
    ])

    assertEquals(
      await checkGenerated({
        artifacts: { ...artifacts, 'src/consumer.ts': additionalPropertiesConsumer },
        imports: { effect: EFFECT },
      }),
      [],
    )
  },
})
