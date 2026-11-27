import { toModelEntry, type DeclaredProjection } from '@skmtc/core'
import { typescriptProjections } from "@skmtc/gen-typescript";
import { ZodProjection } from "./ZodProjection.ts";
import { toEnrichmentSchema, type EnrichmentSchema } from "./enrichments.ts";
import denoJson from "../deno.json" with { type: "json" };

/**
 * Every projection class gen-zod can insert: its own, and gen-typescript's,
 * for the type of a model in a cycle. A generator that inserts from gen-zod
 * spreads this list into its entry's `projections`.
 */
export const zodProjections: readonly DeclaredProjection[] = [
  ZodProjection,
  ...typescriptProjections,
];

export const zodEntry = toModelEntry<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,
  projections: zodProjections,
  transform({ context, ref }) {
    context.insertModel(ZodProjection, ref);
  },
});
