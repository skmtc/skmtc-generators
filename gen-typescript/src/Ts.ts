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
import { SnippetBase } from '@skmtc/core'
import { typescriptEntry } from './mod.ts'

/**
 * Wraps {@link toTsValueInner} to stamp each produced snippet with the JSON
 * pointer of the schema node it was built from (`schema.toLocation()` —
 * property-level when `schema` is an object property), the fine-grained
 * attribution the gen-map uses to trace a span to its exact schema fragment.
 * No-op when attribution is disabled (`toLocation()` returns `undefined`).
 */
export const toTsValue: SchemaToValueFn = (args) => {
  const value = toTsValueInner(args)
  const location = 'toLocation' in args.schema ? args.schema.toLocation() : undefined
  if (location !== undefined && value instanceof SnippetBase) {
    value.schemaPointer = location
  }
  return value
}

const toTsValueInner: SchemaToValueFn = ({
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
        rootRef
      })
    })
    .with({ type: 'array' }, ({ items }) => {
      return new TsArray({ context, destinationPath, modifiers, items, generatorKey, rootRef })
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
    .with({ type: 'union' }, ({ members, discriminator }) => {
      return new TsUnion({
        context,
        destinationPath,
        members,
        discriminator,
        modifiers,
        generatorKey,
        rootRef
      })
    })
    .with({ type: 'number' }, () => new TsNumber({ context, modifiers, generatorKey }))
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
    .with({ type: 'unknown' }, () => new TsUnknown({ context, generatorKey }))
    .exhaustive()
}
