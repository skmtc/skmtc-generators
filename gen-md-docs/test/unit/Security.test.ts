import { assert, assertEquals } from 'jsr:@std/assert@^1.0.0'
import { Security } from '../../src/snippets/Security.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParsedDocument } from '../helpers/toParsedDocument.ts'

Deno.test('Security - lists requirements with scheme kind and scopes', () => {
  const parsed = toParsedDocument({
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/repos': {
        get: {
          security: [{ oauth2: ['repo', 'read:org'] }, { bearerAuth: [] }],
          responses: { '200': { description: 'ok' } }
        }
      }
    },
    components: {
      securitySchemes: {
        oauth2: {
          type: 'oauth2',
          flows: {
            implicit: {
              authorizationUrl: 'https://example.com/auth',
              scopes: { repo: 'repo access', 'read:org': 'read org' }
            }
          }
        },
        bearerAuth: { type: 'http', scheme: 'bearer' }
      }
    }
  })

  assert(parsed.type === 'oas')

  const document = parsed.value
  const security = new Security({
    context: toGenerateContext({ oasDocument: parsed }),
    security: document.operations[0].security,
    securitySchemes: document.components?.securitySchemes
  })

  assertEquals(
    security.toString(),
    [
      '## Security',
      '',
      '- `oauth2` (OAuth2) — scopes: `repo`, `read:org`',
      '- `bearerAuth` (HTTP bearer)'
    ].join('\n')
  )
})

Deno.test('Security - renders the empty string when no security applies', () => {
  const context = toGenerateContext()
  const security = new Security({ context, security: undefined, securitySchemes: undefined })

  assertEquals(security.toString(), '')
})
