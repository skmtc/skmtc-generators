import type { GenerateContextType, OasOperation } from '@skmtc/core'
import { match } from 'ts-pattern'
import { toFreeName } from './toFreeName.ts'

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

  const taken = new Set<string>()

  // Two schemes of the same kind in one requirement need distinct option names.
  const claim = (base: string): string => {
    const option = toFreeName(base, taken)
    taken.add(option)
    return option
  }

  const fields = first.toSecurityScheme().flatMap((scheme): AuthField[] =>
    match(scheme)
      .with({ type: 'apiKey' }, ({ location, name }): AuthField[] => [
        { type: 'apiKey', option: claim('apiKey'), location, name }
      ])
      .with({ type: 'http' }, ({ scheme: httpScheme }): AuthField[] =>
        match(httpScheme.toLowerCase())
          .with('bearer', (): AuthField[] => [{ type: 'bearer', option: claim('token') }])
          .with('basic', (): AuthField[] => [
            { type: 'basic', usernameOption: claim('username'), passwordOption: claim('password') }
          ])
          .otherwise((): AuthField[] => [{ type: 'httpScheme', option: claim('token'), scheme: httpScheme }])
      )
      .with({ type: 'oauth2' }, { type: 'openIdConnect' }, (): AuthField[] => [
        { type: 'bearer', option: claim('token') }
      ])
      .exhaustive()
  )

  return {
    fields,
    alternatives: rest.map(({ requirement }) => Object.keys(requirement).join(' + '))
  }
}
