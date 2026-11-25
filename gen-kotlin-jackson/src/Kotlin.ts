/**
 * The schema-type router: every schema node dispatches to exactly one
 * snippet class. Every branch returns a snippet OBJECT — text exists only
 * inside toString() bodies. Fine-grained attribution is captured via each
 * snippet's super call (`stackTrail: schema.stackTrail.clone()`).
 *
 * Every value this router produces is a Kotlin TYPE EXPRESSION (`String`,
 * `List<OrderItem>`, `Address?`). The declaration shells — a data class's
 * parameter list, an enum class's entries — are built by
 * `KotlinProjection` from the shape dispatch, because only a top-level
 * model has a name to hang them on.
 */
import { toGeneratorOnlyKey } from '@skmtc/core'
import type { Modifiers, SchemaToValueFn, SchemaType } from '@skmtc/core'
import { kotlinJacksonEntry } from './mod.ts'
import { KotlinArray } from './KotlinArray.ts'
import { KotlinObject } from './KotlinObject.ts'
import { KotlinRef } from './KotlinRef.ts'
import { KotlinString } from './KotlinString.ts'
import { KotlinUnion } from './KotlinUnion.ts'
import {
  KotlinBoolean,
  KotlinInteger,
  KotlinNumber,
  KotlinUnknown,
  KotlinVoid,
} from './KotlinScalars.ts'

export const toKotlinValue: SchemaToValueFn = (
  { schema: schemaNode, destinationPath, required, context, rootRef },
) => {
  // `schemaNode` arrives typed as the generic `Schema` parameter, and
  // TypeScript does not narrow a type parameter by discriminant. Widening
  // it to the `SchemaType` union lets the switch below narrow each case on
  // its own — generator code narrows, it does not assert.
  const schema: SchemaType = schemaNode

  const modifiers: Modifiers = {
    required,
    nullable: 'nullable' in schema ? schema.nullable : undefined,
  }

  const generatorKey = toGeneratorOnlyKey({
    generatorId: kotlinJacksonEntry.id,
  })

  switch (schema.type) {
    // Custom values pass through untouched — they are already Stringable.
    case 'custom':
      return schema
    case 'ref':
      return new KotlinRef({
        context,
        destinationPath,
        ref: schema,
        modifiers,
        rootRef,
        schema,
      })
    case 'array':
      return new KotlinArray({
        context,
        destinationPath,
        modifiers,
        items: schema.items,
        generatorKey,
        rootRef,
        schema,
      })
    case 'object':
      return new KotlinObject({
        context,
        destinationPath,
        objectSchema: schema,
        modifiers,
        generatorKey,
        rootRef,
      })
    case 'union':
      return new KotlinUnion({
        context,
        destinationPath,
        members: schema.members,
        discriminator: schema.discriminator,
        modifiers,
        generatorKey,
        rootRef,
        schema,
      })
    case 'string':
      return new KotlinString({
        context,
        stringSchema: schema,
        modifiers,
        destinationPath,
        generatorKey,
      })
    case 'number':
      return new KotlinNumber({
        context,
        schema,
        modifiers,
        destinationPath,
        generatorKey,
      })
    case 'integer':
      return new KotlinInteger({
        context,
        schema,
        modifiers,
        destinationPath,
        generatorKey,
      })
    case 'boolean':
      return new KotlinBoolean({
        context,
        schema,
        modifiers,
        destinationPath,
        generatorKey,
      })
    case 'void':
      return new KotlinVoid({ context, destinationPath, generatorKey })
    case 'unknown':
      return new KotlinUnknown({
        context,
        destinationPath,
        generatorKey,
        modifiers,
        schema,
      })
    default: {
      const _exhaustive: never = schema
      throw new Error(`Unhandled schema type: ${Reflect.get(_exhaustive, 'type')}`)
    }
  }
}
