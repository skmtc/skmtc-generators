import { toModelEntry } from '@skmtc/core'
import { ArktypeProjection } from './ArktypeProjection.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const arktypeEntry = toModelEntry({
  id: denoJson.name,
  transform({ context, refName }) {
    context.insertModel(ArktypeProjection, refName)
  }
})