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
        rootRef,
        schema: ref
      })
    })
    .with({ type: 'array' }, arraySchema => {
      return new ValibotArray({
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
      return new ValibotObject({
        context,
        destinationPath,
        objectSchema,
        modifiers,
        generatorKey,
        rootRef
      })
    })
    .with({ type: 'union' }, unionSchema => {
      return new ValibotUnion({
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
        new ValibotNumber({ context, modifiers, destinationPath, generatorKey, schema: numberSchema })
    )
    .with({ type: 'integer' }, integerSchema => {
      return new ValibotInteger({ context, integerSchema, modifiers, destinationPath, generatorKey })
    })
    .with(
      { type: 'boolean' },
      booleanSchema =>
        new ValibotBoolean({ context, modifiers, destinationPath, generatorKey, schema: booleanSchema })
    )
    .with({ type: 'void' }, () => new ValibotVoid({ context, destinationPath, generatorKey }))
    .with(
      { type: 'string' },
      stringSchema =>
        new ValibotString({ context, stringSchema, modifiers, destinationPath, generatorKey })
    )
    .with(
      { type: 'unknown' },
      unknownSchema =>
        new ValibotUnknown({ context, destinationPath, generatorKey, schema: unknownSchema })
    )
    .exhaustive()
}