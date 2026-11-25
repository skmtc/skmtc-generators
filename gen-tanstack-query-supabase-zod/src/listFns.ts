import type { OasArray, OasOperation, OasRef, OasSchema } from '@skmtc/core'
import invariant from 'tiny-invariant'
import { toObjectSchema } from './toObjectSchema.ts'

type ListKeyAndItem = {
  key: string[]
  schema: OasSchema | OasRef<'schema'>
}

export const toListKeyAndItem = (operation: OasOperation): ListKeyAndItem => {
  const response = operation.toSuccessResponse()?.resolve().toSchema()?.resolve()

  invariant(response, 'Source of list key is undefined')

  if (response.type === 'array') {
    return {
      key: [],
      schema: response.items
    }
  }

  const object = toObjectSchema(response)

  if (object) {
    const result = Object.entries(object.properties ?? {}).find(
      (entry): entry is [string, OasArray] => {
        return entry[1].type === 'array'
      }
    )

    invariant(result, 'Response object does not contain an array')

    const [key, schema] = result

    return {
      key: [key],
      schema: schema.items
    }
  }

  throw new Error('Expected to find a list key')
}

export const isListResponse = (operation: OasOperation) => {
  try {
    const { schema } = toListKeyAndItem(operation)

    // Only treat as a list when items are full records. A singular-item
    // response (e.g. /resource/{id}) may contain a scalar array property
    // like `tags: string[]` that toListKeyAndItem returns as the "list" —
    // that's not a list of rows and shouldn't drive table/select dispatch.
    return toObjectSchema(schema) !== undefined
  } catch {
    return false
  }
}
