import { camelCase, capitalize, isReferencedBack, type ContentSettings, type GenerateContextType, type RefName, type TypeSystemValue } from '@skmtc/core'
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

    const schema = context.resolveSchemaRefOnce(refName);

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
    // `isReferencedBack` asks core, which counts each reference back to
    // this model while its constructor runs, on its own or in a cycle of
    // several models. (Reading the rendered string here would pre-render the
    // value tree outside the attribution pass and orphan every inner snippet
    // from the gen-map.)
    if (isReferencedBack({ context, settings })) {
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
