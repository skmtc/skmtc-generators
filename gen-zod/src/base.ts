import {
  camelCase,
  decapitalize,
  Identifier,
  type RefName,
} from "@skmtc/core";
import { toModelProjectionBase } from "@skmtc/lang-typescript";
import { join } from "@std/path";
import denoJson from "../deno.json" with { type: "json" };

export const ZodBase = toModelProjectionBase({
  id: denoJson.name,

  toIdentifier({ refName }): Identifier {
    const name = decapitalize(camelCase(refName));

    return Identifier.createVariable(name);
  },

  toExportPath({ refName, enrichments, variant }): string {
    const { name } = this.toIdentifier({ refName, enrichments, variant });

    return join("@", "types", `${decapitalize(name)}.generated.ts`);
  },
});
