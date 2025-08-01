import { toModelEntry } from '@skmtc/core'
import { TsInsertable } from './TsInsertable.ts'

export const typescriptEntry = toModelEntry({
  id: '@skmtc/typescript',
  transform({ context, refName }) {
    context.insertModel(TsInsertable, refName)
  }
})
