import { assert, assertEquals, assertStringIncludes, assertThrows } from '@std/assert'
import { OasApiKeySecurityScheme } from '@skmtc/core'
import { Security } from '../../src/snippets/Security.ts'
import { TopIndex } from '../../src/snippets/DocsIndex.ts'
import { toSchemeDetail, toSchemeKind } from '../../src/snippets/SecuritySchemes.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParsedDocument } from '../helpers/toParsedDocument.ts'

/** A document with one scheme of each type, and one operation that names each, or none. */
const parse = () => {
  const parsed = toParsedDocument({
    openapi: '3.0.3',
    info: { title: 'Schemes', version: '1' },
    paths: {
      '/pets': {
        get: {
          security: [{ key: [] }, { oauth: ['read', 'write'] }, { oidc: [] }, {}],
          responses: { '200': { description: 'ok' } }
        }
      }
    },
    components: {
      securitySchemes: {
        key: { type: 'apiKey', in: 'header', name: 'X-API-Key', description: 'Your key' },
        oauth: {
          type: 'oauth2',
          flows: {
            authorizationCode: {
              authorizationUrl: 'https://auth.example.com/authorize',
              tokenUrl: 'https://auth.example.com/token',
              scopes: { write: 'Change pets' }
            },
            clientCredentials: { tokenUrl: 'https://auth.example.com/token', scopes: {} },
            implicit: { authorizationUrl: 'https://auth.example.com/authorize', scopes: { read: 'Read pets' } },
            password: { tokenUrl: 'https://auth.example.com/token', scopes: { admin: '' } }
          }
        },
        oidc: { type: 'openIdConnect', openIdConnectUrl: 'https://auth.example.com/.well-known/openid-configuration' }
      }
    }
  })
  assert(parsed.type === 'oas')

  return parsed
}

Deno.test('Security - names each scheme by its kind, and a requirement that demands none', () => {
  const parsed = parse()
  const [operation] = parsed.value.operations
  assert(operation !== undefined)

  const security = new Security({
    context: toGenerateContext({ oasDocument: parsed }),
    security: operation.security ?? [],
    securitySchemes: parsed.value.components?.securitySchemes
  })

  assertEquals(
    `${security}`,
    [
      '## Security',
      '',
      '- `key` (API key in header `X-API-Key`) — Your key',
      '- `oauth` (OAuth2) — scopes: `read`, `write`',
      '- `oidc` (OpenID Connect)',
      '- _no authentication_'
    ].join('\n')
  )
})

Deno.test("TopIndex - the Authentication list gives each OAuth2 flow's URLs and every scope, and the OpenID Connect URL", () => {
  const parsed = parse()

  const index = new TopIndex({
    context: toGenerateContext({ oasDocument: parsed }),
    title: 'Schemes',
    version: undefined,
    description: undefined,
    servers: [],
    externalDocs: undefined,
    securitySchemes: parsed.value.components?.securitySchemes
  })

  assertStringIncludes(
    `${index}`,
    [
      '## Authentication',
      '',
      '- `key` — API key in header `X-API-Key` — Your key',
      '- `oauth` — OAuth2 — authorization code (authorize `https://auth.example.com/authorize`, token `https://auth.example.com/token`); ' +
        'client credentials (token `https://auth.example.com/token`); implicit (authorize `https://auth.example.com/authorize`); ' +
        'password (token `https://auth.example.com/token`); scopes: `read` (Read pets), `admin`, `write` (Change pets)',
      '- `oidc` — OpenID Connect (`https://auth.example.com/.well-known/openid-configuration`)'
    ].join('\n')
  )
})

// As if core had added a type after these were written.
const unknownScheme = () =>
  Object.assign(new OasApiKeySecurityScheme({ name: 'key', in: 'header' }), { type: 'mutualTLS' })

Deno.test('toSchemeKind - a security scheme type it has no case for fails and names the type', () => {
  assertThrows(
    () => toSchemeKind({ context: toGenerateContext(), scheme: unknownScheme() }),
    Error,
    'Unhandled security scheme type: mutualTLS'
  )
})

Deno.test('toSchemeDetail - a security scheme type it has no case for fails and names the type', () => {
  assertThrows(
    () => toSchemeDetail({ context: toGenerateContext(), scheme: unknownScheme() }),
    Error,
    'Unhandled security scheme type: mutualTLS'
  )
})
