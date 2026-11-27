import { isEmpty } from '@skmtc/core'
import { handleKey, TsSnippet } from '@skmtc/lang-typescript'
import type { CustomValue, GenerateContextType, GeneratorKey, OasObject, OasRef, OasSchema, RefParts, TypeSystemObjectProperties, TypeSystemRecord, TypeSystemValue } from '@skmtc/core'
import { toZodValue } from "./Zod.ts";
import { applyModifiers, type ZodModifiers } from "./applyModifiers.ts";
import { ZodUnknown } from "./ZodUnknown.ts";
import { isDeferred } from "./deferred.ts";

type ZodObjectProps = {
  context: GenerateContextType;
  destinationPath: string;
  objectSchema: OasObject;
  modifiers: ZodModifiers;
  generatorKey: GeneratorKey;
  rootRef?: RefParts;
};

export class ZodObject extends TsSnippet {
  type = "object" as const;
  recordProperties: TypeSystemRecord | null;
  objectProperties: TypeSystemObjectProperties | null;
  modifiers: ZodModifiers;
  /**
   * See `isDeferred`. A property defers its own references as a getter;
   * the record beside the properties has no property to do that, and
   * `.catchall` reads the shape when it is called (zod 4.1 to 4.5), which
   * runs a getter beside it at module load.
   */
  deferred: boolean;

  constructor({
    context,
    generatorKey,
    destinationPath,
    objectSchema,
    modifiers,
    rootRef,
  }: ZodObjectProps) {
    super({ context, generatorKey, stackTrail: objectSchema.stackTrail.clone() });

    this.modifiers = modifiers;

    const { properties, required, additionalProperties } = objectSchema;

    const hasProperties = properties && !isEmpty(properties);

    this.recordProperties = additionalProperties
      ? new ZodRecord({
        context,
        generatorKey,
        destinationPath,
        schema: additionalProperties,
        rootRef,
      })
      : null;

    const objectProperties = hasProperties
      ? new ZodObjectProperties({
        context,
        generatorKey,
        destinationPath,
        properties,
        required, // 'required' here refers to the object's properties, not object itself,
        modifiers,
        rootRef,
      })
      : null;

    this.objectProperties = objectProperties;

    this.deferred = isDeferred(this.recordProperties) ||
      (this.recordProperties !== null &&
        Object.values(objectProperties?.properties ?? {}).some(isDeferred));

    this.register({ imports: { zod: ["z"] }, destinationPath });
  }

  override toString(): string {
    const { objectProperties, recordProperties } = this;

    // `additionalProperties` covers only the keys `properties` does not
    // name, as `.catchall` does.
    if (objectProperties && recordProperties) {
      return applyModifiers(
        `${objectProperties}.catchall(${recordProperties.value})`,
        this.modifiers,
        this.deferred,
      );
    }

    return applyModifiers(
      recordProperties?.toString() ?? objectProperties?.toString() ??
        "z.object({})",
      this.modifiers,
      this.deferred,
    );
  }
}

type ZodObjectPropertiesArgs = {
  modifiers: ZodModifiers;
  context: GenerateContextType;
  destinationPath: string;
  properties: Record<string, OasSchema | OasRef<"schema"> | CustomValue>;
  required: OasObject["required"];
  generatorKey: GeneratorKey;
  rootRef?: RefParts;
};

class ZodObjectProperties extends TsSnippet {
  properties: Record<string, TypeSystemValue>;
  required: string[];

  constructor({
    context,
    generatorKey,
    destinationPath,
    properties,
    required = [],
    rootRef,
  }: ZodObjectPropertiesArgs) {
    super({ context, generatorKey });

    this.required = required;

    this.properties = Object.fromEntries(
      Object.entries(properties).map(([key, property]) => {
        const value = toZodValue({
          destinationPath,
          schema: property,
          required: required?.includes(key),
          context,
          rootRef,
        });

        return [key, value];
      }),
    );
  }

  override toString(): string {
    return `z.object({${
      Object.entries(this.properties)
        .map(([key, value]) => {
          // Quoted and escaped only when it is not an identifier: `'a-b'`,
          // `'a\'b'`.
          const formattedKey = handleKey(key);

          // zod 4 reads a getter's schema when it parses, not when the
          // module loads, and infers the object's type through it.
          return isDeferred(value)
            ? `get ${formattedKey}() { return ${value} }`
            : `${formattedKey}: ${value}`;
        })
        .join(", ")
    }})`;
  }
}

type ZodRecordArgs = {
  context: GenerateContextType;
  destinationPath: string;
  schema: true | OasSchema | OasRef<"schema">;
  generatorKey: GeneratorKey;
  rootRef?: RefParts;
};

class ZodRecord extends TsSnippet {
  value: TypeSystemValue | "true";
  /** See `isDeferred`. */
  deferred: boolean;

  constructor(
    { context, generatorKey, destinationPath, schema, rootRef }: ZodRecordArgs,
  ) {
    super({ context, generatorKey });

    if (schema === true || isEmpty(schema)) {
      this.value = new ZodUnknown({ context, destinationPath, generatorKey });
    } else {
      this.value = toZodValue({
        destinationPath,
        schema,
        required: true,
        context,
        rootRef,
      });
    }

    this.deferred = isDeferred(this.value);
  }

  override toString(): string {
    return `z.record(z.string(), ${this.value})`;
  }
}
