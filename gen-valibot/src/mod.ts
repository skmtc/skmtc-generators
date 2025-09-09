import { toModelEntry } from '@skmtc/core'
import { ValibotInsertable } from './ValibotInsertable.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const valibotEntry = toModelEntry({
  id: denoJson.name,
  transform({ context, refName }) {
    context.insertModel(ValibotInsertable, refName)
  }
})