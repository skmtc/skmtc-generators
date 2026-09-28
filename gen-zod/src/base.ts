import { camelCase, decapitalize } from '@skmtc/core'
import { toTsModelProjectionBase } from '@skmtc/lang-typescript'
import { toEnrichmentSchema, type EnrichmentSchema } from "./enrichments.ts";
import denoJson from "../deno.json" with { type: "json" };

export const ZodBase = toTsModelProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  toIdentifierName({ refName }): string {
    return decapitalize(camelCase(refName));
  },

  toIdentifierType: () => ({ type: "variable" }),

  toExportPath({ refName, enrichments, variant }): string {
    const name = ZodBase.toIdentifierName({ refName, enrichments, variant });

    return `@/types/${decapitalize(name)}.generated.ts`;
  },

  toEnrichmentSchema,
});
