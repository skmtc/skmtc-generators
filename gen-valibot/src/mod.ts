import { toModelEntry } from '@skmtc/core'
import { typescript } from '@skmtc/lang-typescript'
import { ValibotProjection } from './ValibotProjection.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const valibotEntry = toModelEntry({
  id: denoJson.name,
  lang: typescript,
  transform({ context, refName }) {
    context.insertModel(ValibotProjection, refName)
  }
})