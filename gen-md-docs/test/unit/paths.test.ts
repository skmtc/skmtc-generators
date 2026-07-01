import { assert, assertEquals } from 'jsr:@std/assert@^1.0.0'
import { toDocsExportPath } from '../../src/paths.ts'
import { toParsedDocument } from '../helpers/toParsedDocument.ts'

Deno.test('toDocsExportPath - camelCased path segments, method last, grouped by first tag', () => {
  const parsed = toParsedDocument({
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/repos/{owner}/{repo}/actions/runs/{run_id}/rerun': {
        post: { tags: ['actions'], responses: { '200': { description: 'ok' } } }
      }
    }
  })

  assert(parsed.type === 'oas')

  // Each segment is camelCased — `{run_id}` reads `runId`, not `run-id`.
  assertEquals(
    toDocsExportPath(parsed.value.operations[0]),
    '@/docs/actions/repos-owner-repo-actions-runs-runId-rerun-POST.md'
  )
})

Deno.test('toDocsExportPath - untagged operations land directly under docs', () => {
  const parsed = toParsedDocument({
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/ping': { get: { responses: { '200': { description: 'ok' } } } }
    }
  })

  assert(parsed.type === 'oas')

  assertEquals(toDocsExportPath(parsed.value.operations[0]), '@/docs/ping-GET.md')
})
