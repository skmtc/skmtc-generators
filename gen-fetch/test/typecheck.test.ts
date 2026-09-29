/**
 * Emit the fixture into one file, compile it against zod, then call it with a
 * stub fetch. String assertions cannot show that the output compiles, or that
 * the zod check rejects a response the document does not describe.
 *
 * Opt-in (`deno task test:typecheck`) because it needs write/run/net, which the
 * default test task does not grant.
 */
import { assertEquals } from '@std/assert'
import { join } from '@std/path'
import { document, runStack } from './fixture.ts'

const ZOD = 'npm:zod@4.1.12'

const driver = `import { assertEquals, assertRejects } from 'jsr:@std/assert@^1.0.0'
import { ApiError, getApiPrice, updateApiUsersUserId } from './operation.generated.ts'

const requests: Request[] = []

const stub = (status: number, body: unknown): typeof fetch => (input, init) => {
  requests.push(new Request(input, init))
  return Promise.resolve(new Response(JSON.stringify(body), { status }))
}

const price = await getApiPrice(
  { bzn: 'AT', hours: [1, 2] },
  { fetch: stub(200, { unix_seconds: [1], price: [null] }) }
)
assertEquals(price, { unix_seconds: [1], price: [null] })
assertEquals(requests[0].url, 'https://eu.example.com/v1/price?bzn=AT&hours=1&hours=2')

await updateApiUsersUserId(
  { 'user-id': 'a/b', body: { id: '1', name: 'Ada' } },
  { baseUrl: 'http://localhost/', token: 't', fetch: stub(200, { id: '1', name: 'Ada' }) }
)
assertEquals(requests[1].url, 'http://localhost/users/a%2Fb')
assertEquals(requests[1].method, 'PUT')
assertEquals(requests[1].headers.get('authorization'), 'Bearer t')
assertEquals(await requests[1].json(), { id: '1', name: 'Ada' })

// Drift: the API returns a field of the wrong type.
await assertRejects(() => getApiPrice({}, { fetch: stub(200, { unix_seconds: ['x'], price: [] }) }))
await assertRejects(() => getApiPrice({}, { fetch: stub(404, 'missing') }), ApiError)
`

Deno.test({
  name: 'typecheck - the generated file compiles against zod and its calls run',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runStack({ document, exportPath: '@/operation.ts' })
    const root = await Deno.makeTempDir({ prefix: 'gen-fetch-typecheck-' })

    try {
      await Deno.writeTextFile(join(root, 'deno.json'), JSON.stringify({ imports: { zod: ZOD } }, null, 2))
      await Deno.writeTextFile(join(root, 'operation.generated.ts'), artifacts['src/operation.generated.ts'])
      await Deno.writeTextFile(join(root, 'driver.ts'), driver)

      const run = await new Deno.Command('deno', {
        args: ['run', '--check', '--quiet', '--allow-net', '--config', join(root, 'deno.json'), join(root, 'driver.ts')],
        env: { NO_COLOR: '1' },
        stdout: 'piped',
        stderr: 'piped'
      }).output()

      const decoder = new TextDecoder()
      const output = `${decoder.decode(run.stdout)}${decoder.decode(run.stderr)}`

      assertEquals(run.code, 0, `generated fetch client failed:\n${output}`)
    } finally {
      await Deno.remove(root, { recursive: true })
    }
  }
})
