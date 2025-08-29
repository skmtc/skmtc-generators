import { toModelEntry } from '@skmtc/core'
import { ZodInsertable } from './ZodInsertable.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const zodEntry = toModelEntry({
  id: denoJson.name,
  transform({ context, refName }) {
    context.insertModel(ZodInsertable, refName)
  }
})
