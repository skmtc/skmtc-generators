import { capitalize, decapitalize, toEndpointName } from '@skmtc/core'
import type { OasOperation } from '@skmtc/core'

/**
 * SLOT(naming): every name this generator produces grows from ONE root,
 * derived from the operation's METHOD + PATH via core's
 * `toEndpointName` (`post /orders` → `createApiOrders`). Never
 * `operationId` — that is spec-author-controlled and absent from many
 * documents.
 *
 * A leaf module: `base.ts` needs the controller name before any
 * projection is constructed (identity before construction), and the value
 * snippets need the model names while building. Keeping the root here
 * means the controller and the models it consumes can never drift apart.
 */
export const toOperationRoot = (operation: OasOperation): string => {
  return capitalize(toEndpointName(operation))
}

/** `GET /orders/{orderId}` → `GetApiOrdersOrderIdController`. */
export const toControllerName = (operation: OasOperation): string => {
  return `${toOperationRoot(operation)}Controller`
}

/** The handler function — same root, camelCase as Kotlin functions are. */
export const toHandlerName = (operation: OasOperation): string => {
  return decapitalize(toOperationRoot(operation))
}

/**
 * Fallback name for an INLINE request body, handed to the model
 * generator through `insertNormalizedModel`. Identifier-derived, so two
 * operations can never collide on one normalized model.
 */
export const toBodyModelName = (operation: OasOperation): string => {
  return `${toOperationRoot(operation)}Body`
}

/** Fallback name for an INLINE success response. */
export const toResponseModelName = (operation: OasOperation): string => {
  return `${toOperationRoot(operation)}Response`
}
