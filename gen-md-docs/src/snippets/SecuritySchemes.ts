import { SnippetBase, type GenerateContextType, type OasSecurityScheme } from '@skmtc/core'
import { List } from '@skmtc/lang-typescript'
import { InlineCode } from './InlineCode.ts'

/** A security scheme of one type, by the `type` it declares. */
type SchemeOf<Type extends OasSecurityScheme['type']> = Extract<OasSecurityScheme, { type: Type }>

type HttpSchemeArgs = {
  context: GenerateContextType
  scheme: SchemeOf<'http'>
}

/** An HTTP authentication scheme: `HTTP bearer (JWT)`. */
export class HttpScheme extends SnippetBase {
  scheme: string
  bearerFormat: string | undefined

  constructor({ context, scheme }: HttpSchemeArgs) {
    super({ context })

    this.scheme = scheme.scheme
    this.bearerFormat = scheme.bearerFormat
  }

  override toString(): string {
    return this.bearerFormat !== undefined
      ? `HTTP ${this.scheme} (${this.bearerFormat})`
      : `HTTP ${this.scheme}`
  }
}

type ApiKeySchemeArgs = {
  context: GenerateContextType
  scheme: SchemeOf<'apiKey'>
}

/** An API key scheme: ``API key in header `X-API-Key` ``. */
export class ApiKeyScheme extends SnippetBase {
  location: string
  name: InlineCode

  constructor({ context, scheme }: ApiKeySchemeArgs) {
    super({ context })

    this.location = scheme.location
    this.name = new InlineCode({ context, value: scheme.name })
  }

  override toString(): string {
    return `API key in ${this.location} ${this.name}`
  }
}

type NamedSchemeArgs = {
  context: GenerateContextType
}

/** An OAuth2 scheme, by its kind alone: `OAuth2`. */
export class OAuth2Scheme extends SnippetBase {
  constructor({ context }: NamedSchemeArgs) {
    super({ context })
  }

  override toString(): string {
    return 'OAuth2'
  }
}

/** An OpenID Connect scheme, by its kind alone: `OpenID Connect`. */
export class OpenIdConnectScheme extends SnippetBase {
  constructor({ context }: NamedSchemeArgs) {
    super({ context })
  }

  override toString(): string {
    return 'OpenID Connect'
  }
}

/** The kind of a security scheme, as an operation page names it. */
export type SchemeKind = HttpScheme | ApiKeyScheme | OAuth2Scheme | OpenIdConnectScheme

type ToSchemeArgs = {
  context: GenerateContextType
  scheme: OasSecurityScheme
}

/** The kind of a security scheme, by its type: one dispatch, so each type reads only its own fields. */
export const toSchemeKind = ({ context, scheme }: ToSchemeArgs): SchemeKind => {
  switch (scheme.type) {
    case 'http':
      return new HttpScheme({ context, scheme })
    case 'apiKey':
      return new ApiKeyScheme({ context, scheme })
    case 'oauth2':
      return new OAuth2Scheme({ context })
    case 'openIdConnect':
      return new OpenIdConnectScheme({ context })
    default: {
      const _exhaustive: never = scheme
      throw new Error(`Unhandled security scheme type: ${Reflect.get(_exhaustive, 'type')}`)
    }
  }
}

type UrlFlowArgs = {
  context: GenerateContextType
  url: string
}

type AuthorizationCodeFlowArgs = {
  context: GenerateContextType
  authorizationUrl: string
  tokenUrl: string
}

/** The authorization code flow: ``authorization code (authorize `…`, token `…`)``. */
class AuthorizationCodeFlow extends SnippetBase {
  authorizationUrl: InlineCode
  tokenUrl: InlineCode

  constructor({ context, authorizationUrl, tokenUrl }: AuthorizationCodeFlowArgs) {
    super({ context })

    this.authorizationUrl = new InlineCode({ context, value: authorizationUrl })
    this.tokenUrl = new InlineCode({ context, value: tokenUrl })
  }

  override toString(): string {
    return `authorization code (authorize ${this.authorizationUrl}, token ${this.tokenUrl})`
  }
}

/** The client credentials flow: ``client credentials (token `…`)``. */
class ClientCredentialsFlow extends SnippetBase {
  tokenUrl: InlineCode

  constructor({ context, url }: UrlFlowArgs) {
    super({ context })

    this.tokenUrl = new InlineCode({ context, value: url })
  }

  override toString(): string {
    return `client credentials (token ${this.tokenUrl})`
  }
}

/** The implicit flow: ``implicit (authorize `…`)``. */
class ImplicitFlow extends SnippetBase {
  authorizationUrl: InlineCode

  constructor({ context, url }: UrlFlowArgs) {
    super({ context })

    this.authorizationUrl = new InlineCode({ context, value: url })
  }

  override toString(): string {
    return `implicit (authorize ${this.authorizationUrl})`
  }
}

/** The password flow: ``password (token `…`)``. */
class PasswordFlow extends SnippetBase {
  tokenUrl: InlineCode

  constructor({ context, url }: UrlFlowArgs) {
    super({ context })

    this.tokenUrl = new InlineCode({ context, value: url })
  }

  override toString(): string {
    return `password (token ${this.tokenUrl})`
  }
}

type OAuth2ScopeArgs = {
  context: GenerateContextType
  name: string
  /** What the scope grants; empty when the document does not say. */
  detail: string
}

/** One OAuth2 scope and what it grants: ``\`read:pets\` (Read your pets)``. */
class OAuth2Scope extends SnippetBase {
  name: InlineCode
  detail: string | undefined

  constructor({ context, name, detail }: OAuth2ScopeArgs) {
    super({ context })

    this.name = new InlineCode({ context, value: name })
    this.detail = detail === '' ? undefined : detail
  }

  override toString(): string {
    return this.detail !== undefined ? `${this.name} (${this.detail})` : `${this.name}`
  }
}

type OAuth2ScopesArgs = {
  context: GenerateContextType
  /** The scopes of every flow: at least one. */
  scopes: Record<string, string>
}

/** The scopes an OAuth2 scheme offers across its flows: ``scopes: `read` (Read), `write` ``. */
class OAuth2Scopes extends SnippetBase {
  scopes: List<OAuth2Scope[], ', ', 'none'>

  constructor({ context, scopes }: OAuth2ScopesArgs) {
    super({ context })

    this.scopes = new List(
      Object.entries(scopes).map(([name, detail]) => new OAuth2Scope({ context, name, detail })),
      { separator: ', ' }
    )
  }

  override toString(): string {
    return `scopes: ${this.scopes}`
  }
}

type OAuth2DetailArgs = {
  context: GenerateContextType
  scheme: SchemeOf<'oauth2'>
}

/** One part of an {@link OAuth2Detail}: a flow, or the scopes of every flow. */
type OAuth2Part = AuthorizationCodeFlow | ClientCredentialsFlow | ImplicitFlow | PasswordFlow | OAuth2Scopes

/**
 * An OAuth2 scheme as the index describes it: its flows with their URLs, then
 * the scopes of every flow — ``OAuth2 — client credentials (token `…`); scopes: `read` ``.
 */
export class OAuth2Detail extends SnippetBase {
  parts: List<OAuth2Part[], '; ', 'none'>

  constructor({ context, scheme }: OAuth2DetailArgs) {
    super({ context })

    const { flows } = scheme
    const scopes = {
      ...flows.implicit?.scopes,
      ...flows.password?.scopes,
      ...flows.clientCredentials?.scopes,
      ...flows.authorizationCode?.scopes
    }

    this.parts = new List<OAuth2Part[], '; ', 'none'>(
      [
        flows.authorizationCode !== undefined
          ? new AuthorizationCodeFlow({
              context,
              authorizationUrl: flows.authorizationCode.authorizationUrl,
              tokenUrl: flows.authorizationCode.tokenUrl
            })
          : undefined,
        flows.clientCredentials !== undefined
          ? new ClientCredentialsFlow({ context, url: flows.clientCredentials.tokenUrl })
          : undefined,
        flows.implicit !== undefined
          ? new ImplicitFlow({ context, url: flows.implicit.authorizationUrl })
          : undefined,
        flows.password !== undefined ? new PasswordFlow({ context, url: flows.password.tokenUrl }) : undefined,
        Object.keys(scopes).length > 0 ? new OAuth2Scopes({ context, scopes }) : undefined
      ],
      { separator: '; ' }
    )
  }

  override toString(): string {
    return this.parts.values.length > 0 ? `OAuth2 — ${this.parts}` : 'OAuth2'
  }
}

type OpenIdConnectDetailArgs = {
  context: GenerateContextType
  scheme: SchemeOf<'openIdConnect'>
}

/** An OpenID Connect scheme as the index describes it: ``OpenID Connect (`https://…`)``. */
export class OpenIdConnectDetail extends SnippetBase {
  url: InlineCode

  constructor({ context, scheme }: OpenIdConnectDetailArgs) {
    super({ context })

    this.url = new InlineCode({ context, value: scheme.openIdConnectUrl })
  }

  override toString(): string {
    return `OpenID Connect (${this.url})`
  }
}

/** A security scheme as the index describes it. */
export type SchemeDetail = HttpScheme | ApiKeyScheme | OAuth2Detail | OpenIdConnectDetail

/**
 * A security scheme as the index describes it, by its type: the kind for an
 * HTTP or API key scheme, and the details only the index shows for OAuth2
 * (flows and scopes) and OpenID Connect (its URL).
 */
export const toSchemeDetail = ({ context, scheme }: ToSchemeArgs): SchemeDetail => {
  switch (scheme.type) {
    case 'http':
      return new HttpScheme({ context, scheme })
    case 'apiKey':
      return new ApiKeyScheme({ context, scheme })
    case 'oauth2':
      return new OAuth2Detail({ context, scheme })
    case 'openIdConnect':
      return new OpenIdConnectDetail({ context, scheme })
    default: {
      const _exhaustive: never = scheme
      throw new Error(`Unhandled security scheme type: ${Reflect.get(_exhaustive, 'type')}`)
    }
  }
}
