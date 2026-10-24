import { assert, assertEquals } from '@std/assert'
import { Security } from '@/src/snippets/Security.ts'
import { Maybe } from '@/src/Maybe.ts'
import type { OasSecurityRequirement } from '@skmtc/core'
import { toGenerateContext } from '@/test/helpers/toGenerateContext.ts'
import { toParsedDocument } from '@/test/helpers/toParsedDocument.ts'

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
    security: document.operations[0].security ?? [],
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

// Security always renders; the operation decides presence. No requirements
// (undefined or an empty list) means the section is never built.
const toSecurity = (security: OasSecurityRequirement[] | undefined) =>
  Maybe.nonEmpty(
    security,
    present =>
      new Security({ context: toGenerateContext(), security: present, securitySchemes: undefined })
  )

Deno.test('Security - no section when no security applies', () => {
  assertEquals(toSecurity(undefined).toString(), '')
  assertEquals(toSecurity([]).toString(), '')
})
