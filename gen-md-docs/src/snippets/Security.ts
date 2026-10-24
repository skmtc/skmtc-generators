import {
  SnippetBase,
  type GenerateContextType,
  type OasSecurityRequirement,
  type OasSecurityScheme,
  type OasRef
} from '@skmtc/core'
import { Loop, Maybe, Wrap } from '@/src/Maybe.ts'

type SecuritySchemes = Record<string, OasSecurityScheme | OasRef<'securityScheme'>> | undefined

type SecurityArgs = {
  context: GenerateContextType
  security: readonly OasSecurityRequirement[]
  securitySchemes: SecuritySchemes
}

/**
 * Renders the operation's authentication requirements — one bullet per accepted
 * requirement (alternatives are OR-ed; schemes within a requirement are AND-ed),
 * each naming its scheme(s), the scheme kind and any required scopes. The
 * required scopes are among the highest-value details for an agent making an
 * authorized call. Always renders: the operation builds it only when security
 * applies, with `new Maybe(operation.security ?? document?.security, security => new Security(…))`,
 * so a public operation, or a document that declares none, has no section.
 */
export class Security extends SnippetBase {
  requirements: Loop

  constructor({ context, security, securitySchemes }: SecurityArgs) {
    super({ context })

    this.requirements = new Loop(
      security.map(
        requirement => new Wrap(['- ', new Requirement({ context, requirement, securitySchemes })])
      ),
      { separator: '\n' }
    )
  }

  override toString(): string {
    return `## Security\n\n${this.requirements}`
  }
}

type RequirementArgs = {
  context: GenerateContextType
  requirement: OasSecurityRequirement
  securitySchemes: SecuritySchemes
}

/** One requirement: its schemes AND-ed together, or a note when it demands none. */
class Requirement extends SnippetBase {
  content: Maybe<true, Loop, string>

  constructor({ context, requirement, securitySchemes }: RequirementArgs) {
    super({ context })

    this.content = Maybe.nonEmpty(
      Object.entries(requirement.requirement),
      schemes =>
        new Loop(
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
        ),
      () => '_no authentication_'
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
      Maybe.nonEmpty(
        scopes,
        list => new Wrap([' — scopes: ', new Loop(list.map(scope => new Wrap(['`', scope, '`'])))])
      ),
      Maybe.nonEmptyText(scheme?.description, description => new Wrap([' — ', description]))
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
