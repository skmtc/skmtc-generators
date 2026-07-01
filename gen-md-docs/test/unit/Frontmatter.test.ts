import { assert, assertEquals } from 'jsr:@std/assert@^1.0.0'
import { Frontmatter } from '../../src/snippets/Frontmatter.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParsedDocument } from '../helpers/toParsedDocument.ts'

Deno.test('Frontmatter - emits queryable metadata for a full operation', () => {
  const parsed = toParsedDocument({
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/repos/{owner}/{repo}/issues': {
        post: {
          summary: 'Create an issue',
          operationId: 'issues/create',
          tags: ['issues'],
          deprecated: true,
          responses: { '200': { description: 'ok' } }
        }
      }
    }
  })

  assert(parsed.type === 'oas')

  const frontmatter = new Frontmatter({
    context: toGenerateContext({ oasDocument: parsed }),
    operation: parsed.value.operations[0]
  })

  assertEquals(
    frontmatter.toString(),
    [
      '---',
      'type: operation',
      'title: "Create an issue"',
      'operationId: "issues/create"',
      'method: POST',
      'path: "/repos/{owner}/{repo}/issues"',
      'tags:',
      '  - "issues"',
      'deprecated: true',
      '---'
    ].join('\n')
  )
})

Deno.test('Frontmatter - omits absent fields, keeping type/method/path', () => {
  const parsed = toParsedDocument({
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/ping': { get: { responses: { '200': { description: 'ok' } } } }
    }
  })

  assert(parsed.type === 'oas')

  const frontmatter = new Frontmatter({
    context: toGenerateContext({ oasDocument: parsed }),
    operation: parsed.value.operations[0]
  })

  assertEquals(
    frontmatter.toString(),
    ['---', 'type: operation', 'method: GET', 'path: "/ping"', '---'].join('\n')
  )
})

Deno.test('Frontmatter - double-quotes and escapes special characters', () => {
  const parsed = toParsedDocument({
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/x': {
        get: { summary: 'Get "pet": now', responses: { '200': { description: 'ok' } } }
      }
    }
  })

  assert(parsed.type === 'oas')

  const frontmatter = new Frontmatter({
    context: toGenerateContext({ oasDocument: parsed }),
    operation: parsed.value.operations[0]
  })

  const title = frontmatter.toString().split('\n').find(line => line.startsWith('title:'))
  assertEquals(title, 'title: "Get \\"pet\\": now"')
})
