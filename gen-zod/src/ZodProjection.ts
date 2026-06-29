import { camelCase, capitalize, type ContentSettings, type GenerateContextType, type RefName, type TypeSystemValue } from '@skmtc/core'
import { createVariable } from '@skmtc/lang-typescript'
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

    // A recursive schema renders a `z.lazy(() => self)` back-reference
    // (see ZodRef). The enclosing `export const` then references its own
    // initializer, which TypeScript cannot type by inference — TS7022 /
    // TS7024. Annotating the identifier with `typeName` makes `Definition`
    // emit `export const x: z.ZodType<X> = ...`, breaking the cycle.
    //
    // Detected via `modelDepth`, not by rendering: `resolveSchemaRefOnce`
    // above set this key to 1, and every terminal back-reference to this
    // model bumps it further (see ZodRef), so `> 1` means a recursive cycle
    // was emitted into this model's value. (Reading the rendered string here
    // would pre-render the value tree outside the attribution pass and orphan
    // every inner snippet from the gen-map.) Self-recursion is what OpenAPI
    // schemas produce; mutual recursion is not detected by this check.
    if (context.modelDepth[`${ZodBase.id}:${refName}`] > 1) {
      this.settings.identifier.typeName = `z.ZodType<${
        capitalize(camelCase(refName))
      }>`;
    }
  }

  static schemaToValueFn = (...args: Parameters<typeof toZodValue>) => {
    return toZodValue(...args);
  };

  static createIdentifier = createVariable;

  override toString() {
    return `${this.value}`;
  }
}
