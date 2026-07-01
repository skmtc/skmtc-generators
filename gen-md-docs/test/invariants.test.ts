/**
 * Layer 1 — structural invariants over the generated corpus. No ground truth
 * needed: the output must be internally consistent (links resolve, indexes
 * point at real files, frontmatter/JSON parse, fences balance). Runs over the
 * kitchen-sink fixture, and — with `LIVE=1` and `--allow-net` — over the full
 * GitHub REST spec to exercise the same invariants at scale.
 */
import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { StackTrail, toArtifacts } from '@skmtc/core'
import { mdDocsEntry } from '../src/mod.ts'
import { runKitchenSink } from './helpers/kitchenSink.ts'
import {
  checkAll,
  checkAnchorLinks,
  checkCodeFences,
  checkFrontmatter,
  checkIndexIntegrity,
  checkJsonExamples
} from './helpers/invariants.ts'

const { artifacts } = runKitchenSink()

Deno.test('invariants - every `Type` link resolves to a heading in the same doc', () => {
  assertEquals(checkAnchorLinks(artifacts), [])
})

Deno.test('invariants - index and catalog links point at emitted files', () => {
  assertEquals(checkIndexIntegrity(artifacts), [])
})

Deno.test('invariants - frontmatter is valid YAML with the core keys', () => {
  assertEquals(checkFrontmatter(artifacts), [])
})

Deno.test('invariants - fenced JSON examples parse', () => {
  assertEquals(checkJsonExamples(artifacts), [])
})

Deno.test('invariants - code fences are balanced', () => {
  assertEquals(checkCodeFences(artifacts), [])
})

Deno.test({
  name: 'invariants - hold over the full GitHub REST spec (LIVE=1, --allow-net)',
  ignore: Deno.env.get('LIVE') !== '1',
  fn: async () => {
    const value = await (
      await fetch(
        'https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json'
      )
    ).json()

    const { artifacts: live } = toArtifacts({
      traceId: 'invariants-live',
      spanId: 'github',
      startAt: Date.now(),
      document: { type: 'oas', value },
      settings: { basePath: 'github' },
      stackTrail: new StackTrail([]),
      silent: true,
      toGeneratorConfigMap: () => ({
        // @ts-expect-error - factory-emitted transform is monomorphic over Acc
        '@skmtc/gen-md-docs': mdDocsEntry
      })
    })

    assertEquals(checkAll(live), [])
  }
})
