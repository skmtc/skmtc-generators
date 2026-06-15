import { TsString } from './TsString.ts'
import { TsArray } from './TsArray.ts'
import { match } from 'ts-pattern'
import { TsRef } from './TsRef.ts'
import { TsObject } from './TsObject.ts'
import { TsUnion } from './TsUnion.ts'
import type { Modifiers, SchemaToValueFn, SchemaType } from '@skmtc/core'
import { TsNumber } from './TsNumber.ts'
import { TsInteger } from './TsInteger.ts'
import { TsBoolean } from './TsBoolean.ts'
import { TsVoid } from './TsVoid.ts'
import { TsUnknown } from './TsUnknown.ts'
import { toGeneratorOnlyKey, toRefName } from '@skmtc/core'
import { typescriptEntry } from './mod.ts'

/**
 * Maps a parsed schema node to its TypeScript snippet. Fine-grained
 * attribution is captured via each snippet's super call, which snapshots the
 * schema's `stackTrail` (`stackTrail: schema.stackTrail.clone()`) — no
 * router-level wrapper. The originating node is passed to
 * every snippet, including the ones that otherwise receive only decomposed
 * parts (`items` / `members` / `refName`) or nothing (`number` / `unknown`).
 * `void` takes none — `OasVoid` is not part of the `OasSchema` union.
 */
export const toTsValue: SchemaToValueFn = ({
  schema,
  destinationPath,
  required,
  context,
  rootRef
}) => {
  const modifiers: Modifiers = {
    required,
    // description: 'description' in schema ? schema.description : undefined,
    nullable: 'nullable' in schema ? schema.nullable : undefined
  }

  const generatorKey = toGeneratorOnlyKey({ generatorId: typescriptEntry.id })

  return match(schema satisfies SchemaType)
    .with({ type: 'custom' }, custom => custom)
    .with({ type: 'ref' }, ref => {
      return new TsRef({
        context,
        destinationPath,
        refName: toRefName(ref.$ref),
        modifiers,
        rootRef,
        schema: ref
      })
    })
    .with({ type: 'array' }, arraySchema => {
      return new TsArray({
        context,
        destinationPath,
        modifiers,
        items: arraySchema.items,
        generatorKey,
        rootRef,
        schema: arraySchema
      })
    })
    .with({ type: 'object' }, matched => {
      return new TsObject({
        context,
        destinationPath,
        value: matched,
        modifiers,
        generatorKey,
        rootRef
      })
    })
    .with({ type: 'union' }, unionSchema => {
      return new TsUnion({
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
      numberSchema => new TsNumber({ context, modifiers, generatorKey, schema: numberSchema })
    )
    .with(
      { type: 'integer' },
      integerSchema => new TsInteger({ context, integerSchema, modifiers, generatorKey })
    )
    .with(
      { type: 'boolean' },
      booleanSchema => new TsBoolean({ context, booleanSchema, modifiers, generatorKey })
    )
    .with({ type: 'void' }, () => new TsVoid({ context, generatorKey }))
    .with(
      { type: 'string' },
      stringSchema => new TsString({ context, stringSchema, modifiers, generatorKey })
    )
    .with(
      { type: 'unknown' },
      unknownSchema => new TsUnknown({ context, generatorKey, schema: unknownSchema })
    )
    .exhaustive()
}
