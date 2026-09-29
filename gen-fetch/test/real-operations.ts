/**
 * Output-quality check on real operations: fetch each operation's docs slice
 * from skmtc.dev (the one-operation document the service would hand the
 * stack), generate one file per operation, and `deno check` each file on its
 * own. Keyless GETs are then called for real.
 *
 *   deno run -A test/real-operations.ts <out-dir>
 *
 * Needs the network, so it is a script rather than a test.
 */
import { join } from '@std/path'
import { runStack } from './fixture.ts'

const API_ORIGIN = 'https://api.skmtc.dev'
const ZOD = 'npm:zod@4.1.12'

type Sample = { api: string; key: RegExp }

const samples: Sample[] = [
  { api: 'energy-charts/energy-charts-api', key: /^v2\/price\/get$/ },
  { api: 'paribu/paribu-api', key: /^order\/post$/ },
  { api: 'atlassian/the-confluence-cloud-rest-api-v2', key: /^pages\/post$/ },
  { api: 'vercel/api', key: /projects\/:[^/]+\/patch$/ },
  { api: 'faire/faire-external-api', key: /prices.*\/patch$/ },
  { api: 'github/rest', key: /collaborators\/:[^/]+\/put$/ },
  { api: 'cloudflare/cloudflare', key: /purge_cache\/post$/ },
  { api: 'ninjarmm/ninjaone-public-api-2-0', key: /contacts\/get$/ },
  { api: 'elevenlabs/elevenlabs-api-documentation', key: /speech-to-text\/post$/ },
  { api: 'sugra/sugra-api', key: /maddison.*\/get$/ },
  { api: 'pokeapi/poke-api', key: /^api\/v2\/version-group\/:id\/get$/ },
  { api: 'metacopier/metacopier-api', key: /^rest\/api\/v1\/accounts\/post$/ },
  { api: 'aemet/aemet-opendata', key: /^api\/maestro\/municipios\/get$/ },
  { api: 'github/rest', key: /^repos\/:owner\/:repo\/issues\/get$/ },
  { api: 'github/rest', key: /^repos\/:owner\/:repo\/issues\/post$/ },
  { api: 'vercel/api', key: /deployments\/post$/ },
  { api: 'atlassian/the-confluence-cloud-rest-api-v2', key: /^pages\/:id\/get$/ },
  { api: 'cloudflare/cloudflare', key: /dns_records\/post$/ },
  { api: 'elevenlabs/elevenlabs-api-documentation', key: /text-to-speech\/:voice_id\/post$/ },
  { api: 'pokeapi/poke-api', key: /^api\/v2\/pokemon\/get$/ },
  { api: 'frankfurter/frankfurter-api', key: /^latest\/get$/ },
  { api: 'restcountries/rest-countries', key: /^currencies\/v1\/symbols\/get$/ }
]

type DocsIndex = { items: { key: string }[] }

const getJson = async (url: string): Promise<unknown> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status} ${await res.text()}`)
  return res.json()
}

const isDocsIndex = (value: unknown): value is DocsIndex =>
  typeof value === 'object' && value !== null && 'items' in value && Array.isArray(value.items)

const toRef = async (api: string): Promise<string> => {
  const body = await getJson(`${API_ORIGIN}/v1/apis/${api}`)
  if (typeof body === 'object' && body !== null && 'latestVersionRef' in body && typeof body.latestVersionRef === 'string') {
    return body.latestVersionRef
  }
  throw new Error(`${api}: no latestVersionRef`)
}

const toSliceDocument = async (api: string, ref: string, key: string) => {
  const body = await getJson(`${API_ORIGIN}/v1/apis/${api}/revisions/${ref}/docs/${key}`)
  if (typeof body === 'object' && body !== null && 'document' in body && typeof body.document === 'string') {
    return JSON.parse(body.document)
  }
  throw new Error(`${api} ${key}: no document`)
}

const out = Deno.args[0] ?? (await Deno.makeTempDir({ prefix: 'gen-fetch-real-' }))
await Deno.mkdir(out, { recursive: true })
await Deno.writeTextFile(join(out, 'deno.json'), JSON.stringify({ imports: { zod: ZOD } }, null, 2))

const results: { file: string; ok: boolean; detail: string }[] = []

for (const { api, key } of samples) {
  try {
    const ref = await toRef(api)
    const index = await getJson(`${API_ORIGIN}/v1/apis/${api}/revisions/${ref}/docs`)
    const entry = isDocsIndex(index) ? index.items.find(item => key.test(item.key)) : undefined

    if (!entry) {
      results.push({ file: `${api} ${key}`, ok: false, detail: 'no matching operation' })
      continue
    }

    const document = await toSliceDocument(api, ref, entry.key)
    const name = `${api}/${entry.key}`.replace(/[^A-Za-z0-9]+/g, '-')
    const { artifacts, manifest } = runStack({ document, exportPath: `@/${name}.ts` })
    const files = Object.entries(artifacts)

    const errors = JSON.stringify(manifest).match(/"error[^"]*"/g) ?? []

    if (files.length !== 1) {
      results.push({ file: name, ok: false, detail: `${files.length} files; ${errors.join(' ')}` })
      continue
    }

    const [[, content]] = files
    const file = join(out, `${name}.ts`)
    await Deno.writeTextFile(file, content)

    const check = await new Deno.Command('deno', {
      args: ['check', '--quiet', '--config', join(out, 'deno.json'), file],
      env: { NO_COLOR: '1' },
      stdout: 'piped',
      stderr: 'piped'
    }).output()

    const decoder = new TextDecoder()
    results.push({
      file: name,
      ok: check.code === 0,
      detail: `${decoder.decode(check.stdout)}${decoder.decode(check.stderr)}`.trim().slice(0, 1500)
    })
  } catch (error) {
    results.push({ file: `${api} ${key}`, ok: false, detail: String(error).slice(0, 500) })
  }
}

for (const { file, ok, detail } of results) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${file}${ok ? '' : `\n${detail}\n`}`)
}

console.log(`\n${results.filter(({ ok }) => ok).length}/${results.length} pass deno check. Files in ${out}`)
