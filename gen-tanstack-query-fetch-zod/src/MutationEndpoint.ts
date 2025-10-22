import { List, OasVoid, toEndpointName, capitalize, type ListArray } from '@skmtc/core'
import type { OperationInsertableArgs } from '@skmtc/core'
import { MutationFn } from './MutationFn.ts'
import { TanstackQueryBase } from './base.ts'
import { TsInsertable } from '@skmtc/gen-typescript'

export class MutationEndpoint extends TanstackQueryBase {
  tags: ListArray<string>
  mutationFn: MutationFn
  requestBodyTsName: string
  constructor({ context, operation, settings }: OperationInsertableArgs) {
    super({ context, operation, settings })

    this.tags = List.toArray(operation.tags?.map(tag => `'${tag}'`) ?? [])

    this.mutationFn = new MutationFn({ context, operation, settings })

    const requestBody = this.insertNormalizedModel(TsInsertable, {
      schema: operation.toRequestBody(({ schema }) => schema) ?? OasVoid.empty(),
      fallbackName: capitalize(`${toEndpointName(operation)}Body`)
    })

    this.requestBodyTsName = requestBody.identifier.name

    this.register({
      imports: {
        '@tanstack/react-query': ['useMutation', 'useQueryClient', 'UseMutationOptions']
      }
    })
  }

  override toString(): string {
    const { tsResponseName, tsArgsName } = this.mutationFn

    return `(args: UseMutationOptions<${tsResponseName},Error,${tsArgsName},unknown> = {}) => {
      const queryClient = useQueryClient()
      
      const { onSuccess, ...rest } = args

      return useMutation({
        mutationFn: ${this.mutationFn},
        onSuccess: (...successArgs) => {
          // Invalidate and refetch
          void queryClient.invalidateQueries({ queryKey: ${this.tags}})

           onSuccess?.(...successArgs)
        },
        ...rest
      })
    }`
  }
}
