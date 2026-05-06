import { capitalize, camelCase } from '@skmtc/core'
import { join } from '@std/path'
import type { GqlOperation } from '@skmtc/core'

/**
 * Builds the export path for a GraphQL operation's generated file.
 *
 * Format: `gql/operations/<rootKind>_<fieldName>.generated.ts`. The
 * combined `rootKind_fieldName` segment matches `GqlOperation.identifier`,
 * keeping the on-disk artifact discoverable from the operation object.
 */
export const toExportPath = (operation: GqlOperation): string => {
  return join('@', 'gql', 'operations', `${operation.identifier}.generated.ts`)
}

/**
 * Builds the TypeScript identifier base for a GraphQL operation.
 *
 * `getUser` (any rootKind) becomes `GetUser`. Generators append `Args`
 * or `Result` to derive the args / result type names.
 */
export const toBaseIdentifier = (operation: GqlOperation): string => {
  return capitalize(camelCase(operation.fieldName))
}
