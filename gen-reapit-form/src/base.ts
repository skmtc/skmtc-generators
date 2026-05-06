import { capitalize, camelCase } from '@skmtc/core'
import { join } from '@std/path'
import type { GqlOperation } from '@skmtc/core'

/**
 * Reapit form file path. One file per Mutation root field, e.g.
 * `@/forms/CreatePostForm.generated.tsx`.
 */
export const toExportPath = (operation: GqlOperation): string => {
  return join('@', 'forms', `${toFormName(operation)}.generated.tsx`)
}

/**
 * Component identifier — `Mutation.createPost` becomes `CreatePostForm`.
 */
export const toFormName = (operation: GqlOperation): string => {
  return `${capitalize(camelCase(operation.fieldName))}Form`
}
