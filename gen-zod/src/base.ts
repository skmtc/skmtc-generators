import {
  camelCase,
  decapitalize,
  Identifier,
  type RefName,
  toModelBase,
} from "@skmtc/core";
import { join } from "@std/path";
import denoJson from "../deno.json" with { type: "json" };

export const ZodBase = toModelBase({
  id: denoJson.name,

  toIdentifier(refName: RefName): Identifier {
    const name = decapitalize(camelCase(refName));

    return Identifier.createVariable(name);
  },

  toExportPath(refName: RefName): string {
    const { name } = this.toIdentifier(refName);

    return join("@", "types", `${decapitalize(name)}.generated.ts`);
  },
});
