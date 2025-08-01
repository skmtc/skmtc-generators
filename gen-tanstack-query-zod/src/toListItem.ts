import type { OasOperation } from '@skmtc/core'
import invariant from 'tiny-invariant'
type ToListItemArgs = {
  operation: OasOperation
}

export const toListItem = ({ operation }: ToListItemArgs) => {
  const responseBody = operation.toSuccessResponse()?.resolve().toSchema()?.resolve()

  invariant(responseBody?.type === 'array', 'Expected array type')

  return responseBody.items
}
