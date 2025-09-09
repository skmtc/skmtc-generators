import { ValibotString } from './ValibotString.ts'
import { ValibotArray } from './ValibotArray.ts'
import { match } from 'ts-pattern'
import { ValibotRef } from './ValibotRef.ts'
import { ValibotObject } from './ValibotObject.ts'
import { ValibotUnion } from './ValibotUnion.ts'
import type { SchemaToValueFn, SchemaType, Modifiers } from '@skmtc/core'
import { ValibotNumber } from './ValibotNumber.ts'
import { ValibotInteger } from './ValibotInteger.ts'
import { ValibotBoolean } from './ValibotBoolean.ts'
import { ValibotVoid } from './ValibotVoid.ts'
import { ValibotUnknown } from './ValibotUnknown.ts'
import { ValibotNull } from './ValibotNull.ts'
import { toGeneratorOnlyKey, toRefName } from '@skmtc/core'
import { valibotEntry } from './mod.ts'

export const toValibotValue: SchemaToValueFn = ({
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

  const generatorKey = toGeneratorOnlyKey({ generatorId: valibotEntry.id })

  return match(schema satisfies SchemaType)
    .with({ type: 'custom' }, custom => custom)
    .with({ type: 'ref' }, ref => {
      return new ValibotRef({
        context,
        destinationPath,
        refName: toRefName(ref.$ref),
        modifiers,
        generatorKey,
        rootRef
      })
    })
    .with({ type: 'array' }, ({ items }) => {
      return new ValibotArray({ context, destinationPath, modifiers, items, generatorKey, rootRef })
    })
    .with({ type: 'object' }, objectSchema => {
      return new ValibotObject({
        context,
        destinationPath,
        objectSchema,
        modifiers,
        generatorKey,
        rootRef
      })
    })
    .with({ type: 'union' }, ({ members, discriminator }) => {
      return new ValibotUnion({
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
      () => new ValibotNumber({ context, modifiers, destinationPath, generatorKey })
    )
    .with({ type: 'integer' }, integerSchema => {
      return new ValibotInteger({ context, integerSchema, modifiers, destinationPath, generatorKey })
    })
    .with(
      { type: 'boolean' },
      () => new ValibotBoolean({ context, modifiers, destinationPath, generatorKey })
    )
    .with({ type: 'void' }, () => new ValibotVoid({ context, destinationPath, generatorKey }))
    .with(
      { type: 'string' },
      stringSchema =>
        new ValibotString({ context, stringSchema, modifiers, destinationPath, generatorKey })
    )
    .with({ type: 'unknown' }, () => new ValibotUnknown({ context, destinationPath, generatorKey }))
    .exhaustive()
}