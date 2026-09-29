import type { GenerateContextType } from '@skmtc/core'
import { TsProjection } from '@skmtc/gen-typescript'
import { toFreeName } from './toFreeName.ts'

const cache = new WeakMap<GenerateContextType, string>()

/**
 * `ApiError`, unless a gen-typescript type in the document takes that name (a
 * class declares a type too, so the two clash in a shared file). Then the first
 * free `ApiError<n>`. Computed once per run, so every operation agrees on it.
 *
 * gen-zod names are not checked: they start lowercase, so never clash.
 */
export const toErrorClassName = (context: GenerateContextType): string => {
  const cached = cache.get(context)

  if (cached) {
    return cached
  }

  const document = context.document.type === 'oas' ? context.document.value : undefined
  const refNames = document?.components?.toSchemasRefNames() ?? []

  const typeNames = new Set(
    refNames.map(refName => context.toModelContentSettings({ refName, projection: TsProjection }).identifier.name)
  )

  const name = toFreeName('ApiError', typeNames)

  cache.set(context, name)

  return name
}
