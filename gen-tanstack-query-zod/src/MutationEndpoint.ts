import { type OperationInsertableArgs, List, type ListArray } from '@skmtc/core'
import { MutationFn } from './MutationFn.ts'
import { TanstackQueryBase } from './base.ts'
import { RequestBodyTs } from './RequestBodyTs.ts'

export class MutationEndpoint extends TanstackQueryBase {
  tags: ListArray<string>
  mutationFn: MutationFn
  requestBodyTsName: string
  constructor({ context, operation, settings }: OperationInsertableArgs) {
    super({ context, operation, settings })

    this.tags = List.toArray(operation.tags?.map((tag) => `'${tag}'`) ?? [])

    this.mutationFn = new MutationFn({ context, operation, settings })

    this.requestBodyTsName = this.insertOperation(RequestBodyTs, operation).toName()

    this.register({
      imports: {
        '@tanstack/react-query': ['useMutation', 'useQueryClient'],
        zod: ['z']
      }
    })
  }

  override toString(): string {
    return `() => {
      const queryClient = useQueryClient()
      return useMutation({
        mutationFn: ${this.mutationFn},
        onSuccess: () => {
          // Invalidate and refetch
          void queryClient.invalidateQueries({ queryKey: ${this.tags}})
        }
      })
    }`
  }
}
