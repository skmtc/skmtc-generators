import { toModelConfig } from '@skmtc/core'
import { ZodInsertable } from './ZodInsertable.ts'

export const zodConfig = toModelConfig({
  id: '@skmtc/zod',
  transform({ context, refName }) {
    context.insertModel({insertable: ZodInsertable, refName })
  }
})
  