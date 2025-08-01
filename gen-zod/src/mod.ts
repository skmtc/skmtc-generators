import { toModelEntry } from '@skmtc/core'
import { ZodInsertable } from './ZodInsertable.ts'

export const zodEntry = toModelEntry({
  id: '@skmtc/gen-zod',
  transform({ context, refName }) {
    context.insertModel(ZodInsertable, refName)
  }
})
