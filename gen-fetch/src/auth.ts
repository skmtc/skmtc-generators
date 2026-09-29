import { camelCase, capitalize } from '@skmtc/core'
import type { GenerateContextType, OasOperation, OasSecurityScheme } from '@skmtc/core'
import { match } from 'ts-pattern'

/** One credential the generated function accepts through its options. */
export type AuthField =
  | { type: 'apiKey'; option: string; location: 'header' | 'query' | 'cookie'; name: string }
  | { type: 'bearer'; option: string }
  | { type: 'httpScheme'; option: string; scheme: string }
  | { type: 'basic'; usernameOption: string; passwordOption: string }

export type Auth = {
  fields: AuthField[]
  /** The other accepted requirements, by scheme name, for the JSDoc. */
  alternatives: string[]
}

type ToAuthArgs = {
  operation: OasOperation
  context: GenerateContextType
}

/**
 * The first security requirement of the operation (or else of the document),
 * as option fields. A requirement names several schemes when all of them are
 * needed together; the other requirements are alternatives and are only named.
 */
export const toAuth = ({ operation, context }: ToAuthArgs): Auth => {
  const document = context.document.type === 'oas' ? context.document.value : undefined
  const requirements = (operation.security ?? document?.security ?? []).filter(
    ({ requirement }) => Object.keys(requirement).length > 0
  )

  const [first, ...rest] = requirements

  if (!first) {
    return { fields: [], alternatives: [] }
  }

  const schemes = document?.components?.securitySchemes ?? {}
  const taken = new Set<string>()

  // Two schemes of the same kind in one requirement need distinct option names.
  const claim = (base: string, schemeName: string): string => {
    const option = taken.has(base) ? `${base}${capitalize(camelCase(schemeName))}` : base
    taken.add(option)
    return option
  }

  const fields = Object.keys(first.requirement).flatMap((schemeName): AuthField[] => {
    const scheme: OasSecurityScheme | undefined = schemes[schemeName]?.resolve()

    if (!scheme) {
      return []
    }

    return match(scheme)
      .with({ type: 'apiKey' }, ({ location, name }): AuthField[] => [
        { type: 'apiKey', option: claim('apiKey', schemeName), location, name }
      ])
      .with({ type: 'http' }, ({ scheme: httpScheme }): AuthField[] =>
        match(httpScheme.toLowerCase())
          .with('bearer', (): AuthField[] => [{ type: 'bearer', option: claim('token', schemeName) }])
          .with('basic', (): AuthField[] => [
            {
              type: 'basic',
              usernameOption: claim('username', schemeName),
              passwordOption: claim('password', schemeName)
            }
          ])
          .otherwise((): AuthField[] => [
            { type: 'httpScheme', option: claim('token', schemeName), scheme: httpScheme }
          ])
      )
      .with({ type: 'oauth2' }, { type: 'openIdConnect' }, (): AuthField[] => [
        { type: 'bearer', option: claim('token', schemeName) }
      ])
      .exhaustive()
  })

  return {
    fields,
    alternatives: rest.map(({ requirement }) => Object.keys(requirement).join(' + '))
  }
}
