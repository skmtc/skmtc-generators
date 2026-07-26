import { ArktypeString } from './ArktypeString.ts'
import { ArktypeArray } from './ArktypeArray.ts'
import { match } from 'ts-pattern'
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
import { toGeneratorOnlyKey, toRefName } from '@skmtc/core'
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

  return match(schema satisfies SchemaType)
    .with({ type: 'custom' }, custom => new ArktypeCustom({ context, custom, generatorKey }))
    .with({ type: 'ref' }, ref => {
      return new ArktypeRef({
        context,
        destinationPath,
        refName: toRefName(ref.$ref),
        modifiers,
        rootRef,
        schema: ref
      })
    })
    .with({ type: 'array' }, arraySchema => {
      return new ArktypeArray({
        context,
        destinationPath,
        modifiers,
        items: arraySchema.items,
        generatorKey,
        rootRef,
        schema: arraySchema
      })
    })
    .with({ type: 'object' }, objectSchema => {
      return new ArktypeObject({
        context,
        destinationPath,
        objectSchema,
        modifiers,
        generatorKey,
        rootRef
      })
    })
    .with({ type: 'union' }, unionSchema => {
      return new ArktypeUnion({
        context,
        destinationPath,
        members: unionSchema.members,
        discriminator: unionSchema.discriminator,
        modifiers,
        generatorKey,
        rootRef,
        schema: unionSchema
      })
    })
    .with(
      { type: 'number' },
      numberSchema =>
        new ArktypeNumber({ context, modifiers, destinationPath, generatorKey, schema: numberSchema })
    )
    .with({ type: 'integer' }, integerSchema => {
      return new ArktypeInteger({ context, integerSchema, modifiers, destinationPath, generatorKey })
    })
    .with(
      { type: 'boolean' },
      booleanSchema =>
        new ArktypeBoolean({
          context,
          modifiers,
          destinationPath,
          generatorKey,
          schema: booleanSchema
        })
    )
    .with({ type: 'void' }, () => new ArktypeVoid({ context, destinationPath, generatorKey }))
    .with(
      { type: 'string' },
      stringSchema =>
        new ArktypeString({ context, stringSchema, modifiers, destinationPath, generatorKey })
    )
    .with(
      { type: 'unknown' },
      unknownSchema =>
        new ArktypeUnknown({ context, destinationPath, generatorKey, schema: unknownSchema })
    )
    .exhaustive()
}

toArktypeValue satisfies SchemaToValueFn
