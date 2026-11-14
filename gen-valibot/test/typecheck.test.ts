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
import { checkGenerated, cycleDocument, runE2eFixture, unionDocument } from '@skmtc/test-support'
import { valibotEntry } from '../src/mod.ts'

/** The valibot the output is checked against, the workspace's pin. */
const VALIBOT = 'npm:valibot@1.1.0'

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
