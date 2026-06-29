import { toModelEntry } from '@skmtc/core'
import { ZodProjection } from "./ZodProjection.ts";
import { toEnrichmentSchema, type EnrichmentSchema } from "./enrichments.ts";
import denoJson from "../deno.json" with { type: "json" };

export const zodEntry = toModelEntry<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,
  transform({ context, refName }) {
    context.insertModel(ZodProjection, refName);
  },
});
