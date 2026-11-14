/**
 * The ground-truth gate: emit the fixture, then compile it.
 *
 * ArkType parses its definitions at the *type* level, so a definition it
 * cannot parse is a TypeScript error, not just a runtime throw —
 * `type("{ name: string }[]")` fails to check with
 *
 *   TS2345: Argument of type '"{ name: string }[]"' is not assignable to
 *           parameter of type '"'{' is unresolvable"'
 *
 * That makes `deno check` over the generated files a real correctness proof,
 * and it is the only layer that can give one: string equality against a pinned
 * expectation is just as happy to pin output arktype rejects.
 *
 * Opt-in (`deno task test:typecheck`) because it needs write/run/net, which the
 * default test task deliberately does not grant.
 */
import { assertEquals } from '@std/assert'
import { dirname, join } from '@std/path'
import {
  additionalPropertiesCases,
  additionalPropertiesDocument,
  awkwardNamesDocument,
  checkGenerated,
  runE2eFixture
} from '@skmtc/test-support'
import { arktypeEntry } from '../src/mod.ts'
import { runFixture } from './helpers/fixture.ts'

/** The arktype version the generated output is verified against — pinned
 *  exactly, because the gate rests on arktype's type-level parser and a minor
 *  release could change what it accepts without any change here. */
const ARKTYPE = 'npm:arktype@2.2.3'

// gen-arktype cannot render a model that refers to itself, and one such model
// fails the whole run, so these checks leave out `Tree` and its cases.
const { Tree: _tree, ...nonRecursiveSchemas } = additionalPropertiesDocument.components?.schemas ?? {}
const nonRecursiveDocument = { ...additionalPropertiesDocument, components: { schemas: nonRecursiveSchemas } }
const nonRecursiveCases = additionalPropertiesCases.filter(check => check.model !== 'Tree')

/**
 * Reads each named property as its own type, and checks every case of
 * `additionalPropertiesCases`. Loading it throws on the first case arktype
 * gets wrong.
 */
const additionalPropertiesConsumer = `import { type } from 'arktype'
import { upload } from '@/types/upload.generated.ts'
import { limits } from '@/types/limits.generated.ts'
import { dotted } from '@/types/dotted.generated.ts'

export const readUpload = (value: typeof upload.infer): string[] => [value.app_id, ...value.images]
export const readLimits = (value: typeof limits.infer): [string, string | undefined] => [value.id, value.note]
export const readDotted = (value: typeof dotted.infer): string => value['a.b']

const accepts: Record<string, (value: unknown) => boolean> = {
  Upload: value => !(upload(value) instanceof type.errors),
  Limits: value => !(limits(value) instanceof type.errors),
  Dotted: value => !(dotted(value) instanceof type.errors)
}

for (const check of ${JSON.stringify(nonRecursiveCases)}) {
  const accepted = accepts[check.model](check.value)
  if (accepted !== check.accept) {
    throw new Error(\`\${check.model}, \${check.name}: accepted is \${accepted}\`)
  }
}
`

// The trap: a \`[string]\` index signature checks every key, so a typed
// record beside named keys of other types does not even load: arktype
// throws "Intersection at id of string and number results in an
// unsatisfiable type" (#101).
Deno.test({
  name: 'typecheck - a record beside properties checks only the other keys',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: '@skmtc/gen-arktype',
      entry: arktypeEntry,
      document: nonRecursiveDocument
    })

    assertEquals(Object.keys(artifacts).sort(), [
      'src/types/dotted.generated.ts',
      'src/types/limits.generated.ts',
      'src/types/upload.generated.ts'
    ])

    assertEquals(
      await checkGenerated({
        artifacts: { ...artifacts, 'src/consumer.ts': additionalPropertiesConsumer },
        imports: { arktype: ARKTYPE }
      }),
      []
    )
  }
})

Deno.test({
  name: 'typecheck - generated artifacts compile against arktype',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runFixture()
    const root = await Deno.makeTempDir({ prefix: 'gen-arktype-typecheck-' })

    try {
      // The emitted files import `arktype` and the `@/` alias and nothing else,
      // so they check standalone against a config of their own.
      await Deno.writeTextFile(
        join(root, 'deno.json'),
        JSON.stringify({ imports: { '@/': './src/', arktype: ARKTYPE } }, null, 2)
      )

      for (const [path, content] of Object.entries(artifacts)) {
        const target = join(root, path)
        await Deno.mkdir(dirname(target), { recursive: true })
        await Deno.writeTextFile(target, content)
      }

      const check = await new Deno.Command('deno', {
        args: [
          'check',
          '--quiet',
          '--config',
          join(root, 'deno.json'),
          ...Object.keys(artifacts).map(path => join(root, path))
        ],
        env: { NO_COLOR: '1' },
        stdout: 'piped',
        stderr: 'piped'
      }).output()

      const decoder = new TextDecoder()
      const output = `${decoder.decode(check.stdout)}${decoder.decode(check.stderr)}`

      assertEquals(check.code, 0, `generated arktype does not compile:\n${output}`)
    } finally {
      await Deno.remove(root, { recursive: true })
    }
  }
})

// The trap: `decapitalize` turns `Default` into `default`, and
// `export const default = …` does not parse; `2FA` starts with a digit.
Deno.test({
  name: 'typecheck - schema names that are not valid bindings are repaired',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runE2eFixture({ id: '@skmtc/gen-arktype', entry: arktypeEntry, document: awkwardNamesDocument })

    assertEquals(Object.keys(artifacts).sort(), [
      'src/types/_2FA.generated.ts',
      'src/types/account.generated.ts',
      'src/types/defaultValue.generated.ts',
      'src/types/deleteValue.generated.ts'
    ])

    assertEquals(await checkGenerated({ artifacts, imports: { arktype: ARKTYPE } }), [])
  }
})
