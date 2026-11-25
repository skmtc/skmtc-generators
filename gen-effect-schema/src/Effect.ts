/**
 * The schema-type router: every schema node dispatches to exactly one
 * snippet class. Every branch returns a snippet OBJECT — text exists
 * only inside toString() bodies. Fine-grained attribution is captured
 * via each snippet's super call (`stackTrail: schema.stackTrail.clone()`).
 */
import { toGeneratorOnlyKey } from '@skmtc/core'
import type {
  GenerateContextType,
  SchemaToValueFn,
  SchemaType,
} from '@skmtc/core'
import { effectSchemaEntry } from './mod.ts'
import type { EffectModifiers } from './modifiers.ts'
import { generatorSchema } from './enrichments.ts'
import * as v from 'valibot'
import { EffectArray } from './EffectArray.ts'
import { EffectObject } from './EffectObject.ts'
import { EffectRef } from './EffectRef.ts'
import { EffectString } from './EffectString.ts'
import { EffectUnion } from './EffectUnion.ts'
import {
  EffectBoolean,
  EffectInteger,
  EffectNumber,
  EffectUnknown,
  EffectVoid,
} from './EffectScalars.ts'

/**
 * The framework's args plus `coerce`, the query-string mode: a number or
 * boolean leaf decodes from the string a URL carries, and an array from a
 * lone value. Recursive sites call `toEffectValueImpl` to thread it down;
 * the framework, which knows only `SchemaToValueFn`, calls `toEffectValue`,
 * where it is off.
 */
export type ToEffectValueImplArgs = Parameters<SchemaToValueFn>[0] & {
  coerce?: boolean
}

/**
 * Whether this project renders defaults — the generator-scoped flag, read
 * off the context so it reaches a value built by a peer (a route
 * generator's parameter objects) as well as one built by the projection.
 */
const rendersDefaults = (context: GenerateContextType): boolean =>
  v.parse(
    generatorSchema,
    context.readEnrichment([effectSchemaEntry.id, '_generator']),
  )
    ?.defaults ?? false

/**
 * The schema's `default`, wherever the engine keeps it: `default` on the
 * scalar and object nodes, `defaultValue` on arrays. A ref carries none —
 * OpenAPI 3.0 drops a `$ref`'s siblings — so a default on a named model
 * has to be written on an inline one. The same lift as gen-zod's.
 */
const toDefaultValue = (
  context: GenerateContextType,
  schema: SchemaType,
): unknown => {
  if (!rendersDefaults(context)) {
    return undefined
  }

  if ('default' in schema) {
    return schema.default
  }

  if ('defaultValue' in schema) {
    return schema.defaultValue
  }

  return undefined
}

export const toEffectValueImpl = (
  {
    schema: schemaNode,
    destinationPath,
    required,
    context,
    rootRef,
    coerce = false,
  }: ToEffectValueImplArgs,
) => {
  // `schemaNode` arrives typed as the generic `Schema` parameter, and
  // TypeScript does not narrow a type parameter by discriminant.
  // Widening it to the `SchemaType` union lets the switch below narrow
  // each case on its own.
  const schema: SchemaType = schemaNode

  const modifiers: EffectModifiers = {
    required,
    nullable: 'nullable' in schema ? schema.nullable : undefined,
    defaultValue: toDefaultValue(context, schema),
  }

  const generatorKey = toGeneratorOnlyKey({ generatorId: effectSchemaEntry.id })

  // deno-lint-ignore skmtc/single-dispatch -- this is the router: `toEffectValue` is this function with `coerce` off. The rule knows a router by the name `to<X>Value`.
  switch (schema.type) {
    // Custom values pass through untouched — they are already Stringable.
    case 'custom':
      return schema
    case 'ref':
      return new EffectRef({
        context,
        destinationPath,
        ref: schema,
        modifiers,
        rootRef,
        schema,
        coerce,
      })
    case 'array':
      return new EffectArray({
        context,
        destinationPath,
        arraySchema: schema,
        modifiers,
        generatorKey,
        rootRef,
        coerce,
      })
    case 'object':
      return new EffectObject({
        context,
        destinationPath,
        objectSchema: schema,
        modifiers,
        generatorKey,
        rootRef,
        coerce,
      })
    case 'union':
      return new EffectUnion({
        context,
        destinationPath,
        members: schema.members,
        discriminator: schema.discriminator,
        modifiers,
        generatorKey,
        rootRef,
        coerce,
        schema,
      })
    case 'string':
      return new EffectString({
        context,
        stringSchema: schema,
        modifiers,
        destinationPath,
        generatorKey,
      })
    case 'number':
      return new EffectNumber({
        context,
        schema,
        modifiers,
        destinationPath,
        generatorKey,
        coerce,
      })
    case 'integer':
      return new EffectInteger({
        context,
        schema,
        modifiers,
        destinationPath,
        generatorKey,
        coerce,
      })
    case 'boolean':
      return new EffectBoolean({
        context,
        schema,
        modifiers,
        destinationPath,
        generatorKey,
        coerce,
      })
    case 'void':
      return new EffectVoid({ context, destinationPath, generatorKey })
    case 'unknown':
      return new EffectUnknown({
        context,
        destinationPath,
        generatorKey,
        schema,
      })
    default: {
      const _exhaustive: never = schema
      throw new Error(`Unhandled schema type: ${Reflect.get(_exhaustive, 'type')}`)
    }
  }
}

/** The framework entry: the same router, with `coerce` off. */
export const toEffectValue: SchemaToValueFn = (args) => toEffectValueImpl(args)
