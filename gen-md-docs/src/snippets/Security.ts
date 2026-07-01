import {
  SnippetBase,
  type GenerateContextType,
  type OasSecurityRequirement,
  type OasSecurityScheme,
  type OasRef
} from '@skmtc/core'

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
  requirements: string[]

  constructor({ context, security, securitySchemes }: SecurityArgs) {
    super({ context })

    this.requirements = (security ?? []).map(requirement =>
      toRequirementLine(requirement, securitySchemes)
    )
  }

  override toString(): string {
    if (this.requirements.length === 0) {
      return ''
    }

    const list = this.requirements.map(line => `- ${line}`).join('\n')

    return `## Security\n\n${list}`
  }
}

/** One requirement: its schemes AND-ed together, or a note when it demands none. */
const toRequirementLine = (
  requirement: OasSecurityRequirement,
  securitySchemes: SecuritySchemes
): string => {
  const schemes = Object.entries(requirement.requirement)

  if (schemes.length === 0) {
    return '_no authentication_'
  }

  return schemes
    .map(([name, scopes]) => toSchemeText(name, scopes, securitySchemes?.[name]?.resolve()))
    .join(' + ')
}

/** A scheme reference: its name, its kind (when resolvable) and its scopes. */
const toSchemeText = (
  name: string,
  scopes: string[],
  scheme: OasSecurityScheme | undefined
): string => {
  const kind = scheme !== undefined ? ` (${toSchemeKind(scheme)})` : ''
  const scopeList =
    scopes.length > 0 ? ` — scopes: ${scopes.map(scope => `\`${scope}\``).join(', ')}` : ''

  return `\`${name}\`${kind}${scopeList}`
}

const toSchemeKind = (scheme: OasSecurityScheme): string => {
  switch (scheme.type) {
    case 'http':
      return `HTTP ${scheme.scheme}`
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
