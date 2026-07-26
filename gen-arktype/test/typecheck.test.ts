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
import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { dirname, join } from 'jsr:@std/path@^1.0.0'
import { runFixture } from './helpers/fixture.ts'

/** The arktype version the generated output is verified against — pinned
 *  exactly, because the gate rests on arktype's type-level parser and a minor
 *  release could change what it accepts without any change here. */
const ARKTYPE = 'npm:arktype@2.2.3'

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
