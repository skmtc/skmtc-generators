import { camelCase, decapitalize } from '@skmtc/core'
import { toModelProjectionBase } from '@skmtc/lang-typescript'
import { join } from "@std/path";
import denoJson from "../deno.json" with { type: "json" };

export const ZodBase = toModelProjectionBase({
  id: denoJson.name,

  toIdentifierName({ refName }): string {
    return decapitalize(camelCase(refName));
  },

  toIdentifierType: () => ({ kind: "variable" }),

  toExportPath({ refName, enrichments, variant }): string {
    const name = this.toIdentifierName({ refName, enrichments, variant });

    return join("@", "types", `${decapitalize(name)}.generated.ts`);
  },
});
