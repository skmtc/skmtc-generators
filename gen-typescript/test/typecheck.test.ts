/**
 * The ground-truth gate for objects with `properties` and
 * `additionalProperties` together (#101): emit them, then type-check a
 * consumer that reads and builds them. A pinned string is just as happy to
 * pin a type that compiles but reads every property as `unknown`.
 *
 * Opt-in (`deno task test:typecheck`) because it needs write/run/net, which
 * the default test task does not grant.
 */
import { assertEquals } from '@std/assert'
import { additionalPropertiesDocument, awkwardNamesDocument, checkGenerated, runE2eFixture } from '@skmtc/test-support'
import { typescriptEntry } from '../src/mod.ts'

// The trap: `{app_id: string, …} | {[key: string]: unknown}` compiles on its
// own. Only a consumer that reads `Upload['app_id']` sees `unknown`, and an
// assignment such as `const id: string = upload.app_id` also compiles when
// the type is `never` or `any`, so `Equals` compares the types both ways.
const consumer = `import type {Upload} from '@/types/upload.generated.ts'
import type {Limits} from '@/types/limits.generated.ts'
import type {Dotted} from '@/types/dotted.generated.ts'
import type {Tree} from '@/types/tree.generated.ts'

type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false

export const uploadAppId: Equals<Upload['app_id'], string> = true
export const uploadImages: Equals<Upload['images'], Array<string>> = true
export const limitsId: Equals<Limits['id'], string> = true
export const limitsNote: Equals<Limits['note'], string | undefined> = true
export const dottedKey: Equals<Dotted['a.b'], string> = true
export const treeLabel: Equals<Tree['label'], string> = true

export const upload: Upload = {app_id: 'app', images: [], extra: {any: 'value'}}
export const limits: Limits = {id: 'api', note: 'n', perMinute: 60}
export const dotted: Dotted = {'a.b': 'x', aXb: 1}
export const tree: Tree = {label: 'root', left: {label: 'leaf'}}

// @ts-expect-error The required keys are missing; the old union took this through its record member.
export const missing: Upload = {other: 1}
`

Deno.test({
  name: 'typecheck - a consumer reads and builds every object with properties and a record as its own type',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: '@skmtc/gen-typescript',
      entry: typescriptEntry,
      document: additionalPropertiesDocument
    })

    // A failed run renders no files, and nothing then fails the check.
    assertEquals(Object.keys(artifacts).sort(), [
      'src/types/dotted.generated.ts',
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

// The trap: `2FA` starts with a digit, and `export type 2FA = …` does not
// parse. `capitalize` keeps `Default` and `Delete` valid, so their file
// paths do not change.
Deno.test({
  name: 'typecheck - schema names that are not valid bindings are repaired',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runE2eFixture({ id: '@skmtc/gen-typescript', entry: typescriptEntry, document: awkwardNamesDocument })

    assertEquals(Object.keys(artifacts).sort(), [
      'src/types/_2FA.generated.ts',
      'src/types/account.generated.ts',
      'src/types/default.generated.ts',
      'src/types/delete.generated.ts'
    ])

    assertEquals(await checkGenerated({ artifacts, imports: {} }), [])
  }
})
