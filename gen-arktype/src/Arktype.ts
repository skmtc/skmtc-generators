import { ArktypeString } from './ArktypeString.ts'
import { ArktypeArray } from './ArktypeArray.ts'
import { ArktypeRef } from './ArktypeRef.ts'
import { ArktypeObject } from './ArktypeObject.ts'
import { ArktypeUnion } from './ArktypeUnion.ts'
import { ArktypeCustom } from './ArktypeCustom.ts'
import type { SchemaToValueFn, SchemaType, TypeSystemArgs, Modifiers } from '@skmtc/core'
import { ArktypeNumber } from './ArktypeNumber.ts'
import { ArktypeInteger } from './ArktypeInteger.ts'
import { ArktypeBoolean } from './ArktypeBoolean.ts'
import { ArktypeVoid } from './ArktypeVoid.ts'
import { ArktypeUnknown } from './ArktypeUnknown.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import { arktypeEntry } from './mod.ts'

/**
 * Every value the router produces. Snippets that nest other values hold this
 * union rather than core's `TypeSystemValue`, so they can read a child's
 * `stringSyntax` / `atomicStringSyntax` directly — annotating the router
 * `SchemaToValueFn` instead would widen each value back to `TypeSystemValue`,
 * which carries neither field.
 */
export type ArktypeValue =
  | ArktypeCustom
  | ArktypeRef
  | ArktypeArray
  | ArktypeObject
  | ArktypeUnion
  | ArktypeNumber
  | ArktypeInteger
  | ArktypeBoolean
  | ArktypeVoid
  | ArktypeString
  | ArktypeUnknown

/**
 * Maps a parsed schema node to its arktype snippet — the one place
 * `schema.type` decides what renders a node.
 */
export const toArktypeValue = ({
  schema,
  destinationPath,
  required,
  context,
  rootRef
}: TypeSystemArgs<SchemaType>): ArktypeValue => {
  const modifiers: Modifiers = {
    required,
    nullable: 'nullable' in schema ? schema.nullable : undefined
  }

  const generatorKey = toGeneratorOnlyKey({ generatorId: arktypeEntry.id })

  switch (schema.type) {
    case 'custom':
      return new ArktypeCustom({ context, custom: schema, generatorKey })
    case 'ref':
      return new ArktypeRef({
        context,
        destinationPath,
        ref: schema,
        modifiers,
        rootRef,
        schema
      })
    case 'array':
      return new ArktypeArray({
        context,
        destinationPath,
        modifiers,
        items: schema.items,
        generatorKey,
        rootRef,
        schema
      })
    case 'object':
      return new ArktypeObject({
        context,
        destinationPath,
        objectSchema: schema,
        modifiers,
        generatorKey,
        rootRef
      })
    case 'union':
      return new ArktypeUnion({
        context,
        destinationPath,
        members: schema.members,
        discriminator: schema.discriminator,
        modifiers,
        generatorKey,
        rootRef,
        schema
      })
    case 'number':
      return new ArktypeNumber({ context, modifiers, destinationPath, generatorKey, schema })
    case 'integer':
      return new ArktypeInteger({ context, integerSchema: schema, modifiers, destinationPath, generatorKey })
    case 'boolean':
      return new ArktypeBoolean({
        context,
        modifiers,
        destinationPath,
        generatorKey,
        schema
      })
    case 'void':
      return new ArktypeVoid({ context, destinationPath, generatorKey })
    case 'string':
      return new ArktypeString({ context, stringSchema: schema, modifiers, destinationPath, generatorKey })
    case 'unknown':
      return new ArktypeUnknown({ context, destinationPath, generatorKey, schema })
    default: {
      const _exhaustive: never = schema
      throw new Error(`Unhandled schema type: ${_exhaustive}`)
    }
  }
}

toArktypeValue satisfies SchemaToValueFn
