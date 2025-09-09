import { toModelEntry } from '@skmtc/core'
import { ArktypeInsertable } from './ArktypeInsertable.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const arktypeEntry = toModelEntry({
  id: denoJson.name,
  transform({ context, refName }) {
    context.insertModel(ArktypeInsertable, refName)
  }
})