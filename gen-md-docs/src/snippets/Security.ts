import {
  SnippetBase,
  type GenerateContextType,
  type OasSecurityRequirement,
  type OasSecurityScheme,
  type OasRef
} from '@skmtc/core'
import { safeResolve, UNRESOLVED_REF } from '../safeResolve.ts'

type SecuritySchemes =
  | Record<string, OasSecurityScheme | OasRef<'securityScheme'>>
  | undefined

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
  requirements: SecurityRequirement[]

  constructor({ context, security, securitySchemes }: SecurityArgs) {
    super({ context })

    this.requirements = (security ?? []).map(
      requirement => new SecurityRequirement({ context, requirement, securitySchemes })
    )
  }

  override toString(): string {
    if (this.requirements.length === 0) {
      return ''
    }

    const list = this.requirements.map(requirement => `- ${requirement}`).join('\n')

    return `## Security\n\n${list}`
  }
}

type SecurityRequirementArgs = {
  context: GenerateContextType
  requirement: OasSecurityRequirement
  securitySchemes: SecuritySchemes
}

/** One requirement: its schemes AND-ed together, or a note when it demands none. */
class SecurityRequirement extends SnippetBase {
  schemes: (SchemeUse | SchemeName)[]

  constructor({ context, requirement, securitySchemes }: SecurityRequirementArgs) {
    super({ context })

    this.schemes = Object.entries(requirement.requirement).map(([name, scopes]) => {
      const entry = securitySchemes?.[name]
      const scheme = entry !== undefined ? safeResolve(entry) : undefined

      return scheme !== undefined
        ? new SchemeUse({ context, name, scopes, scheme })
        : new SchemeName({ context, name, scopes, unresolved: entry !== undefined })
    })
  }

  override toString(): string {
    return this.schemes.length === 0 ? '_no authentication_' : this.schemes.join(' + ')
  }
}

type SchemeUseArgs = {
  context: GenerateContextType
  name: string
  scopes: string[]
  scheme: OasSecurityScheme
}

/** A scheme the requirement names: its name, kind, the scopes it needs and its description. */
class SchemeUse extends SnippetBase {
  name: string
  scheme: OasSecurityScheme
  scopes: Scopes
  description: string | undefined

  constructor({ context, name, scopes, scheme }: SchemeUseArgs) {
    super({ context })

    this.name = name
    this.scheme = scheme
    this.scopes = new Scopes({ context, scopes })
    this.description = scheme.description === '' ? undefined : scheme.description
  }

  override toString(): string {
    const description = this.description !== undefined ? ` — ${this.description}` : ''

    return `\`${this.name}\` (${toSchemeKind(this.scheme)})${this.scopes}${description}`
  }
}

type SchemeNameArgs = {
  context: GenerateContextType
  name: string
  scopes: string[]
  /** The scheme is a `$ref` that names nothing, rather than a name the document does not declare. */
  unresolved: boolean
}

/**
 * A scheme the docs cannot describe: its name and scopes. One whose `$ref`
 * names nothing is marked with {@link UNRESOLVED_REF}; a name the document
 * does not declare at all is shown as it is.
 */
class SchemeName extends SnippetBase {
  name: string
  scopes: Scopes
  unresolved: boolean

  constructor({ context, name, scopes, unresolved }: SchemeNameArgs) {
    super({ context })

    this.name = name
    this.scopes = new Scopes({ context, scopes })
    this.unresolved = unresolved
  }

  override toString(): string {
    return this.unresolved
      ? `\`${this.name}\`${UNRESOLVED_REF}${this.scopes}`
      : `\`${this.name}\`${this.scopes}`
  }
}

type ScopesArgs = {
  context: GenerateContextType
  scopes: string[]
}

/** The scopes a requirement needs from a scheme, as ` — scopes: …`. Renders the empty string when it needs none. */
class Scopes extends SnippetBase {
  scopes: string[]

  constructor({ context, scopes }: ScopesArgs) {
    super({ context })

    this.scopes = scopes
  }

  override toString(): string {
    if (this.scopes.length === 0) {
      return ''
    }

    return ` — scopes: ${this.scopes.map(scope => `\`${scope}\``).join(', ')}`
  }
}

const toSchemeKind = (scheme: OasSecurityScheme): string => {
  switch (scheme.type) {
    case 'http':
      return scheme.bearerFormat !== undefined
        ? `HTTP ${scheme.scheme} (${scheme.bearerFormat})`
        : `HTTP ${scheme.scheme}`
    case 'apiKey':
      return `API key in ${scheme.location} \`${scheme.name}\``
    case 'oauth2':
      return 'OAuth2'
    case 'openIdConnect':
      return 'OpenID Connect'
    default: {
      const exhaustive: never = scheme
      throw new Error(`Unhandled security scheme: ${JSON.stringify(exhaustive)}`)
    }
  }
}
