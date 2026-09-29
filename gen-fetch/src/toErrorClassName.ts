import type { GenerateContextType } from '@skmtc/core'
import { TsProjection } from '@skmtc/gen-typescript'
import { ZodProjection } from '@skmtc/gen-zod'

const cache = new WeakMap<GenerateContextType, string>()

/**
 * `ApiError`, unless a model in the document already takes that name, in which
 * case the first free `ApiError<n>`. Models and operations can share one file,
 * and an API's own `ApiError` schema is common. Computed once per run from
 * every component schema, so every operation agrees on the name.
 */
export const toErrorClassName = (context: GenerateContextType): string => {
  const cached = cache.get(context)

  if (cached) {
    return cached
  }

  const document = context.document.type === 'oas' ? context.document.value : undefined
  const refNames = document?.components?.toSchemasRefNames() ?? []

  const taken = new Set(
    refNames.flatMap(refName => [
      context.toModelContentSettings({ refName, projection: TsProjection }).identifier.name,
      context.toModelContentSettings({ refName, projection: ZodProjection }).identifier.name
    ])
  )

  const name = ['ApiError', ...Array.from({ length: taken.size }, (_, index) => `ApiError${index + 2}`)].find(
    candidate => !taken.has(candidate)
  ) ?? 'ApiError'

  cache.set(context, name)

  return name
}
