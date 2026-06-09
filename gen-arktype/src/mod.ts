import { toModelEntry } from '@skmtc/core'
import { typescript } from '@skmtc/lang-typescript'
import { ArktypeProjection } from './ArktypeProjection.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const arktypeEntry = toModelEntry({
  id: denoJson.name,
  lang: typescript,
  transform({ context, refName }) {
    context.insertModel(ArktypeProjection, refName)
  }
})