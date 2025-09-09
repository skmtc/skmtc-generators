import { ArktypeString } from './ArktypeString.ts'
import { ArktypeArray } from './ArktypeArray.ts'
import { match } from 'ts-pattern'
import { ArktypeRef } from './ArktypeRef.ts'
import { ArktypeObject } from './ArktypeObject.ts'
import { ArktypeUnion } from './ArktypeUnion.ts'
import type { SchemaToValueFn, SchemaType, Modifiers } from '@skmtc/core'
import { ArktypeNumber } from './ArktypeNumber.ts'
import { ArktypeInteger } from './ArktypeInteger.ts'
import { ArktypeBoolean } from './ArktypeBoolean.ts'
import { ArktypeVoid } from './ArktypeVoid.ts'
import { ArktypeUnknown } from './ArktypeUnknown.ts'
import { ArktypeNull } from './ArktypeNull.ts'
import { toGeneratorOnlyKey, toRefName } from '@skmtc/core'
import { arktypeEntry } from './mod.ts'

export const toArktypeValue: SchemaToValueFn = ({
  schema,
  destinationPath,
  required,
  context,
  rootRef
}) => {
  const modifiers: Modifiers = {
    required,
    nullable: 'nullable' in schema ? schema.nullable : undefined
  }

  const generatorKey = toGeneratorOnlyKey({ generatorId: arktypeEntry.id })

  return match(schema satisfies SchemaType)
    .with({ type: 'custom' }, custom => custom)
    .with({ type: 'ref' }, ref => {
      return new ArktypeRef({
        context,
        destinationPath,
        refName: toRefName(ref.$ref),
        modifiers,
        generatorKey,
        rootRef
      })
    })
    .with({ type: 'array' }, ({ items }) => {
      return new ArktypeArray({ context, destinationPath, modifiers, items, generatorKey, rootRef })
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
    .with({ type: 'union' }, ({ members, discriminator }) => {
      return new ArktypeUnion({
        context,
        destinationPath,
        members,
        discriminator,
        modifiers,
        generatorKey,
        rootRef
      })
    })
    .with(
      { type: 'number' },
      () => new ArktypeNumber({ context, modifiers, destinationPath, generatorKey })
    )
    .with({ type: 'integer' }, integerSchema => {
      return new ArktypeInteger({ context, integerSchema, modifiers, destinationPath, generatorKey })
    })
    .with(
      { type: 'boolean' },
      () => new ArktypeBoolean({ context, modifiers, destinationPath, generatorKey })
    )
    .with({ type: 'void' }, () => new ArktypeVoid({ context, destinationPath, generatorKey }))
    .with(
      { type: 'string' },
      stringSchema =>
        new ArktypeString({ context, stringSchema, modifiers, destinationPath, generatorKey })
    )
    .with({ type: 'unknown' }, () => new ArktypeUnknown({ context, destinationPath, generatorKey }))
    .exhaustive()
}