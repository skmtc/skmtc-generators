import { camelCase, decapitalize } from '@skmtc/core'
import { toTsModelProjectionBase } from '@skmtc/lang-typescript'
import { toEnrichmentSchema, type EnrichmentSchema } from "./enrichments.ts";
import denoJson from "../deno.json" with { type: "json" };

export const ZodBase = toTsModelProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  toIdentifierName({ refName }): string {
    const name = decapitalize(camelCase(refName));

    // A schema named `200` would give `export const 200`. The prefix differs
    // from gen-typescript's so the two names stay apart in a shared file.
    return /^[0-9]/.test(name) ? `schema${name}` : name;
  },

  toIdentifierType: () => ({ type: "variable" }),

  // `this` is this base's config, so the file follows the base's own name. A projection
  // that overrides toIdentifierName keeps this file unless it overrides toExportPath too.
  toExportPath({ refName, enrichments, variant }): string {
    const exportPath = enrichments?.generator?.exportPath;

    if (exportPath) {
      return exportPath;
    }

    const name = this.toIdentifierName({ refName, enrichments, variant });

    return `@/types/${decapitalize(name)}.generated.ts`;
  },

  toEnrichmentSchema,
});
