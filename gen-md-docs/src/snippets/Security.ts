import {
  SnippetBase,
  type GenerateContextType,
  type OasSecurityRequirement,
  type OasSecurityScheme,
  type OasRef
} from '@skmtc/core'
import { List } from '@skmtc/lang-typescript'
import { Heading } from './Heading.ts'
import { InlineCode } from './InlineCode.ts'
import { toSchemeKind, type SchemeKind } from './SecuritySchemes.ts'
import { UnresolvedMarker } from './Unresolved.ts'
import { safeResolve } from '../safeResolve.ts'

type SecuritySchemes =
  | Record<string, OasSecurityScheme | OasRef<'securityScheme'>>
  | undefined

type SecurityArgs = {
  context: GenerateContextType
  /** The requirements that apply: at least one. */
  security: OasSecurityRequirement[]
  securitySchemes: SecuritySchemes
}

/**
 * Renders the operation's authentication requirements — one bullet per accepted
 * requirement (alternatives are OR-ed; schemes within a requirement are AND-ed),
 * each naming its scheme(s), the scheme kind and any required scopes. The
 * required scopes are among the highest-value details for an agent making an
 * authorised call. Its owner writes it only when a requirement applies.
 */
export class Security extends SnippetBase {
  heading: Heading
  requirements: List<RequirementLine[], '\n', 'none'>

  constructor({ context, security, securitySchemes }: SecurityArgs) {
    super({ context })

    this.heading = new Heading({ context, level: 2, text: 'Security' })
    this.requirements = new List(
      security.map(requirement => new RequirementLine({ context, requirement, securitySchemes })),
      { separator: '\n' }
    )
  }

  override toString(): string {
    return `${this.heading}\n\n${this.requirements}`
  }
}

type RequirementLineArgs = {
  context: GenerateContextType
  requirement: OasSecurityRequirement
  securitySchemes: SecuritySchemes
}

/** One requirement's bullet: its schemes AND-ed together, or a note when it demands none. */
class RequirementLine extends SnippetBase {
  requirement: SchemeUses | NoAuthentication

  constructor({ context, requirement, securitySchemes }: RequirementLineArgs) {
    super({ context })

    const schemes = Object.entries(requirement.requirement)

    this.requirement =
      schemes.length > 0
        ? new SchemeUses({ context, schemes, securitySchemes })
        : new NoAuthentication({ context })
  }

  override toString(): string {
    return `- ${this.requirement}`
  }
}

type NoAuthenticationArgs = {
  context: GenerateContextType
}

/** A requirement that demands no scheme: `_no authentication_`. */
class NoAuthentication extends SnippetBase {
  constructor({ context }: NoAuthenticationArgs) {
    super({ context })
  }

  override toString(): string {
    return '_no authentication_'
  }
}

type SchemeUsesArgs = {
  context: GenerateContextType
  /** Each scheme the requirement names, with the scopes it needs: at least one. */
  schemes: [string, string[]][]
  securitySchemes: SecuritySchemes
}

/** The schemes one requirement names, AND-ed: `` `oauth` (OAuth2) — scopes: `read` + `key` (API key in header `X`) ``. */
class SchemeUses extends SnippetBase {
  uses: List<(SchemeUse | SchemeName)[], ' + ', 'none'>

  constructor({ context, schemes, securitySchemes }: SchemeUsesArgs) {
    super({ context })

    this.uses = new List(
      schemes.map(([name, scopes]) => {
        const entry = securitySchemes?.[name]
        const scheme = entry !== undefined ? safeResolve(entry) : undefined

        return scheme !== undefined
          ? new SchemeUse({ context, name, scopes, scheme })
          : new SchemeName({ context, name, scopes, unresolved: entry !== undefined })
      }),
      { separator: ' + ' }
    )
  }

  override toString(): string {
    return `${this.uses}`
  }
}

type SchemeUseArgs = {
  context: GenerateContextType
  name: string
  scopes: string[]
  scheme: OasSecurityScheme
}

/** One part of a {@link SchemeUse}. */
type SchemeUsePart = SchemeHead | Scopes | string

/** A scheme the requirement names: its name and kind, the scopes it needs, and its description. */
class SchemeUse extends SnippetBase {
  parts: List<SchemeUsePart[], ' — ', 'none'>

  constructor({ context, name, scopes, scheme }: SchemeUseArgs) {
    super({ context })

    this.parts = new List<SchemeUsePart[], ' — ', 'none'>(
      [
        new SchemeHead({ context, name, kind: toSchemeKind({ context, scheme }) }),
        scopes.length > 0 ? new Scopes({ context, scopes }) : undefined,
        scheme.description === '' ? undefined : scheme.description
      ],
      { separator: ' — ' }
    )
  }

  override toString(): string {
    return `${this.parts}`
  }
}

type SchemeHeadArgs = {
  context: GenerateContextType
  name: string
  kind: SchemeKind
}

/** A scheme's name and kind: `` `oauth` (OAuth2) ``. */
class SchemeHead extends SnippetBase {
  name: InlineCode
  kind: SchemeKind

  constructor({ context, name, kind }: SchemeHeadArgs) {
    super({ context })

    this.name = new InlineCode({ context, value: name })
    this.kind = kind
  }

  override toString(): string {
    return `${this.name} (${this.kind})`
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
 * names nothing gets the unresolved marker; a name the document does not
 * declare at all is shown as it is.
 */
class SchemeName extends SnippetBase {
  parts: List<(List<(InlineCode | UnresolvedMarker)[], ' ', 'none'> | Scopes)[], ' — ', 'none'>

  constructor({ context, name, scopes, unresolved }: SchemeNameArgs) {
    super({ context })

    this.parts = new List<(List<(InlineCode | UnresolvedMarker)[], ' ', 'none'> | Scopes)[], ' — ', 'none'>(
      [
        new List<(InlineCode | UnresolvedMarker)[], ' ', 'none'>(
          [new InlineCode({ context, value: name }), unresolved ? new UnresolvedMarker({ context }) : undefined],
          { separator: ' ' }
        ),
        scopes.length > 0 ? new Scopes({ context, scopes }) : undefined
      ],
      { separator: ' — ' }
    )
  }

  override toString(): string {
    return `${this.parts}`
  }
}

type ScopesArgs = {
  context: GenerateContextType
  /** The scopes: at least one. */
  scopes: string[]
}

/** The scopes a requirement needs from a scheme: ``scopes: `read`, `write` ``. */
class Scopes extends SnippetBase {
  scopes: List<InlineCode[], ', ', 'none'>

  constructor({ context, scopes }: ScopesArgs) {
    super({ context })

    this.scopes = new List(
      scopes.map(scope => new InlineCode({ context, value: scope })),
      { separator: ', ' }
    )
  }

  override toString(): string {
    return `scopes: ${this.scopes}`
  }
}
