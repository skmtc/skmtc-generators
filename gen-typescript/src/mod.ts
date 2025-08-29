import { toModelEntry } from '@skmtc/core'
import { TsInsertable } from './TsInsertable.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const typescriptEntry = toModelEntry({
  id: denoJson.name,
  transform({ context, refName }) {
    context.insertModel(TsInsertable, refName)
  }
})
