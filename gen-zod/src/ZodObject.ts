import { isEmpty } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'
import type { CustomValue, GenerateContextType, GeneratorKey, Modifiers, OasObject, OasRef, OasSchema, RefName, TypeSystemObjectProperties, TypeSystemRecord, TypeSystemValue } from '@skmtc/core'
import { toZodValue } from "./Zod.ts";
import { applyModifiers } from "./applyModifiers.ts";
import { ZodUnknown } from "./ZodUnknown.ts";
import { isDeferred } from "./deferred.ts";

type ZodObjectProps = {
  context: GenerateContextType;
  destinationPath: string;
  objectSchema: OasObject;
  modifiers: Modifiers;
  generatorKey: GeneratorKey;
  rootRef?: RefName;
};

export class ZodObject extends TsSnippet {
  type = "object" as const;
  recordProperties: TypeSystemRecord | null;
  objectProperties: TypeSystemObjectProperties | null;
  modifiers: Modifiers;
  /**
   * See `isDeferred`. A property defers its own references as a getter;
   * the record beside the properties has no property to do that.
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

    this.objectProperties = hasProperties
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

    this.deferred = isDeferred(this.recordProperties);

    this.register({ imports: { zod: ["z"] }, destinationPath });
  }

  override toString(): string {
    const { objectProperties, recordProperties } = this;

    if (objectProperties && recordProperties) {
      return applyModifiers(
        `${objectProperties}.and(${recordProperties})`,
        this.modifiers,
      );
    }

    return applyModifiers(
      recordProperties?.toString() ?? objectProperties?.toString() ??
        "z.object({})",
      this.modifiers,
    );
  }
}

type ZodObjectPropertiesArgs = {
  modifiers: Modifiers;
  context: GenerateContextType;
  destinationPath: string;
  properties: Record<string, OasSchema | OasRef<"schema"> | CustomValue>;
  required: OasObject["required"];
  generatorKey: GeneratorKey;
  rootRef?: RefName;
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
          // Check if key needs quotes
          const needsQuotes = /[^a-zA-Z0-9_$]/.test(key) || /^\d/.test(key);
          const formattedKey = needsQuotes ? `"${key}"` : key;

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
  rootRef?: RefName;
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
