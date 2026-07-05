/**
 * Layer 3 — golden snapshot. The full kitchen-sink output is pinned as raw text
 * so any change to a rendered document surfaces as a reviewable diff. Regenerate
 * with `deno task test:update` (then review the diff before committing).
 */
import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { runKitchenSink } from './helpers/kitchenSink.ts'

const goldenUrl = new URL('./golden/kitchen-sink.txt', import.meta.url)
const goldenDir = new URL('./golden/', import.meta.url)

/** Concatenate every artifact, path-sorted, under a `==== path ====` header. */
const toCorpus = (artifacts: Record<string, string>): string =>
  Object.keys(artifacts)
    .sort()
    .map(path => `==== ${path} ====\n\n${artifacts[path]}`)
    .join('\n\n')

Deno.test('golden - kitchen-sink output matches the committed golden', async () => {
  const { artifacts } = runKitchenSink()
  const corpus = toCorpus(artifacts)

  if (Deno.env.get('UPDATE_GOLDEN') === '1') {
    await Deno.mkdir(goldenDir, { recursive: true })
    await Deno.writeTextFile(goldenUrl, corpus)

    return
  }

  assertEquals(corpus, await Deno.readTextFile(goldenUrl))
})
