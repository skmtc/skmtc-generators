import type { ContentSettings, GenerateContextType, RefName, TypeSystemValue } from '@skmtc/core'
import { createVariable } from '@skmtc/lang-typescript'
import { TsProjection } from '@skmtc/gen-typescript'
import { toZodValue } from "./Zod.ts";
import { ZodBase } from "./base.ts";
import { isDeferred } from "./deferred.ts";
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
  /** Renders `z.lazy(() => …)`: the value holds a reference inside a cycle that no getter defers. */
  lazy: boolean;
  constructor(
    { context, refName, settings, destinationPath, rootRef }: ConstructorArgs,
  ) {
    super({ context, refName, settings });

    const schema = context.resolveSchemaRefOnce(refName);

    this.value = toZodValue({
      schema,
      required: true,
      destinationPath,
      context,
      rootRef,
    });

    // A reference inside a cycle is deferred by the nearest object property,
    // as a getter (see ZodObject). A union, array or record of the model's
    // own has no property on the way, so the whole model is deferred instead.
    // Its `export const` then refers to its own initializer, which TypeScript
    // cannot type by inference (TS7022 / TS7024): the annotation
    // `z.ZodType<T>` breaks the cycle, with T gen-typescript's type for the
    // model, imported into this file unless the two share it.
    this.lazy = isDeferred(this.value);

    if (this.lazy) {
      const type = context.insertModel(TsProjection, refName, {
        variant: "main",
        destinationPath,
      });

      this.settings.identifier.typeName = `z.ZodType<${type.toName()}>`;

      this.register({ imports: { zod: ["z"] } });
    }
  }

  static schemaToValueFn = (...args: Parameters<typeof toZodValue>) => {
    return toZodValue(...args);
  };

  static createIdentifier = createVariable;

  override toString() {
    return this.lazy ? `z.lazy(() => ${this.value})` : `${this.value}`;
  }
}
