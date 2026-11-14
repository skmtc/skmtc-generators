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
  awkwardNamesDocument,
  checkGenerated,
  cycleDocument,
  runE2eFixture,
} from '@skmtc/test-support'
import { effectSchemaEntry } from '../src/mod.ts'

/** The Effect the output is checked against: `Schema.Codec` is Effect 4. */
const EFFECT = 'npm:effect@4.1.4'

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

// The trap: `2FA` starts with a digit, and `export const 2FA = …` does not
// parse. `capitalize` keeps `Default` and `Delete` valid.
Deno.test({
  name: 'typecheck - schema names that are not valid bindings are repaired',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: '@skmtc/gen-effect-schema',
      entry: effectSchemaEntry,
      document: awkwardNamesDocument,
    })

    assertEquals(Object.keys(artifacts).sort(), [
      'src/schema-effect/_2FA.generated.ts',
      'src/schema-effect/account.generated.ts',
      'src/schema-effect/default.generated.ts',
      'src/schema-effect/delete.generated.ts',
      'src/schema-effect/index.generated.ts',
    ])

    assertEquals(await checkGenerated({ artifacts, imports: { effect: EFFECT } }), [])
  },
})
