import { toModelEntry } from '@skmtc/core'
import { ValibotProjection } from './ValibotProjection.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const valibotEntry = toModelEntry({
  id: denoJson.name,
  transform({ context, refName }) {
    context.insertModel(ValibotProjection, refName)
  }
})