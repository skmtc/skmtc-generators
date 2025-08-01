import { toOperationEntry } from '@skmtc/core'
import { MockRoute } from './MockRoute.ts'

export const MswEntry = toOperationEntry({
  id: '@skmtc/msw',

  transform: ({ context, operation }) => {
    context.insertOperation(MockRoute, operation)
  }
})
