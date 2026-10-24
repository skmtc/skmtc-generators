import {
  SnippetBase,
  type GenerateContextType,
  type OasSecurityRequirement,
  type OasSecurityScheme,
  type OasRef,
  type Stringable
} from '@skmtc/core'
import { Loop, Maybe, Wrap } from '../Maybe.ts'

type SecuritySchemes = Record<string, OasSecurityScheme | OasRef<'securityScheme'>> | undefined

type SecurityArgs = {
  context: GenerateContextType
  security: OasSecurityRequirement[] | undefined
  securitySchemes: SecuritySchemes
}

/**
 * Renders the operation's authentication requirements — one bullet per accepted
 * requirement (alternatives are OR-ed; schemes within a requirement are AND-ed),
 * each naming its scheme(s), the scheme kind and any required scopes. The
 * required scopes are among the highest-value details for an agent making an
 * authorised call. Renders the empty string when no security applies — a public
 * operation, or a document that declares none.
 */
export class Security extends SnippetBase {
  content: Maybe<Loop, Wrap>

  constructor({ context, security, securitySchemes }: SecurityArgs) {
    super({ context })

    const requirements = new Loop(
      (security ?? []).map(
        requirement => new Wrap(['- ', new Requirement({ context, requirement, securitySchemes })])
      ),
      { separator: '\n' }
    )

    this.content = new Maybe(requirements, loop => new Wrap(['## Security\n\n', loop]))
  }

  override toString(): string {
    return `${this.content}`
  }
}

type RequirementArgs = {
  context: GenerateContextType
  requirement: OasSecurityRequirement
  securitySchemes: SecuritySchemes
}

/** One requirement: its schemes AND-ed together, or a note when it demands none. */
class Requirement extends SnippetBase {
  content: Stringable

  constructor({ context, requirement, securitySchemes }: RequirementArgs) {
    super({ context })

    const schemes = Object.entries(requirement.requirement)

    this.content =
      schemes.length === 0
        ? '_no authentication_'
        : new Loop(
            schemes.map(
              ([name, scopes]) =>
                new SchemeReference({
                  context,
                  name,
                  scopes,
                  scheme: securitySchemes?.[name]?.resolve()
                })
            ),
            { separator: ' + ' }
          )
  }

  override toString(): string {
    return `${this.content}`
  }
}

type SchemeReferenceArgs = {
  context: GenerateContextType
  name: string
  scopes: string[]
  scheme: OasSecurityScheme | undefined
}

/** A scheme reference: its name, its kind (when resolvable), scopes and description. */
class SchemeReference extends SnippetBase {
  content: Wrap

  constructor({ context, name, scopes, scheme }: SchemeReferenceArgs) {
    super({ context })

    this.content = new Wrap([
      '`',
      name,
      '`',
      new Maybe(
        scheme,
        resolved => new Wrap([' (', new SchemeKind({ context, scheme: resolved }), ')'])
      ),
      new Maybe(
        new Loop(scopes.map(scope => new Wrap(['`', scope, '`']))),
        loop => new Wrap([' — scopes: ', loop])
      ),
      new Maybe(scheme?.description, description => new Wrap([' — ', description]))
    ])
  }

  override toString(): string {
    return `${this.content}`
  }
}

type SchemeKindArgs = {
  context: GenerateContextType
  scheme: OasSecurityScheme
}

/** The kind of a security scheme, e.g. `HTTP bearer (JWT)` or ``API key in header `X-Key` ``. */
class SchemeKind extends SnippetBase {
  content: Wrap

  constructor({ context, scheme }: SchemeKindArgs) {
    super({ context })

    switch (scheme.type) {
      case 'http':
        this.content = new Wrap([
          'HTTP ',
          scheme.scheme,
          new Maybe(scheme.bearerFormat, format => new Wrap([' (', format, ')']))
        ])
        break
      case 'apiKey':
        this.content = new Wrap(['API key in ', scheme.location, ' `', scheme.name, '`'])
        break
      case 'oauth2':
        this.content = new Wrap(['OAuth2'])
        break
      case 'openIdConnect':
        this.content = new Wrap(['OpenID Connect'])
        break
      default: {
        const exhaustive: never = scheme
        throw new Error(`Unhandled security scheme: ${JSON.stringify(exhaustive)}`)
      }
    }
  }

  override toString(): string {
    return `${this.content}`
  }
}
