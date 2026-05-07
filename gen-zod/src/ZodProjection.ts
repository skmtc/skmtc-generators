import {
  type ContentSettings,
  type GenerateContextType,
  Identifier,
  type RefName,
  type TypeSystemValue,
} from "@skmtc/core";
import { toZodValue } from "./Zod.ts";
import { ZodBase } from "./base.ts";
import type { EnrichmentSchema } from "./enrichments.ts";

type ConstructorArgs = {
  context: GenerateContextType;
  destinationPath: string;
  refName: RefName;
  settings: ContentSettings<EnrichmentSchema>;
  rootRef?: RefName;
};

export class ZodProjection extends ZodBase {
  value: TypeSystemValue;
  constructor(
    { context, refName, settings, destinationPath, rootRef }: ConstructorArgs,
  ) {
    super({ context, refName, settings });

    const schema = context.resolveSchemaRefOnce(refName, ZodBase.id);

    this.value = toZodValue({
      schema,
      required: true,
      destinationPath,
      context,
      rootRef,
    });
  }

  static schemaToValueFn = (...args: Parameters<typeof toZodValue>) => {
    return toZodValue(...args);
  };

  static createIdentifier = Identifier.createVariable;

  override toString() {
    return `${this.value}`;
  }
}
