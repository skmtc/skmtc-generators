import type { OasOperation } from '@skmtc/core'

export const isListResponse = (operation: OasOperation) => {
  return operation.toSuccessResponse()?.resolve().toSchema()?.resolve()?.type === 'array'
}
