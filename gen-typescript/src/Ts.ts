import { TsString } from './TsString.ts'
import { TsArray } from './TsArray.ts'
import { TsRef } from './TsRef.ts'
import { TsObject } from './TsObject.ts'
import { TsUnion } from './TsUnion.ts'
import { TsIntersection } from './TsIntersection.ts'
import type { Modifiers, SchemaToValueFn, SchemaType } from '@skmtc/core'
import { TsNumber } from './TsNumber.ts'
import { TsInteger } from './TsInteger.ts'
import { TsBoolean } from './TsBoolean.ts'
import { TsVoid } from './TsVoid.ts'
import { TsUnknown } from './TsUnknown.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * Maps a parsed schema node to its TypeScript snippet. Fine-grained
 * attribution is captured via each snippet's super call, which snapshots the
 * schema's `stackTrail` (`stackTrail: schema.stackTrail.clone()`) — no
 * router-level wrapper. The originating node is passed to
 * every snippet, including the ones that otherwise receive only decomposed
 * parts (`items` / `members` / `ref`) or nothing (`number` / `unknown`).
 * `void` takes none — `OasVoid` is not part of the `OasSchema` union.
 */
export const toTsValue: SchemaToValueFn = ({
  schema: schemaNode,
  destinationPath,
  required,
  context,
  rootRef
}) => {
  // `schemaNode` arrives typed as the generic `Schema` parameter, and TypeScript
  // does not narrow a type parameter by discriminant. Widening it to the
  // `SchemaType` union lets the switch below narrow each case on its own —
  // generator code narrows, it does not assert.
  const schema: SchemaType = schemaNode

  const modifiers: Modifiers = {
    required,
    // description: 'description' in schema ? schema.description : undefined,
    nullable: 'nullable' in schema ? schema.nullable : undefined
  }

  const generatorKey = toGeneratorOnlyKey({ generatorId: denoJson.name })

  switch (schema.type) {
    case 'custom':
      return schema
    case 'ref':
      return new TsRef({
        context,
        destinationPath,
        ref: schema,
        modifiers,
        rootRef,
        schema
      })
    case 'array':
      return new TsArray({
        context,
        destinationPath,
        modifiers,
        items: schema.items,
        generatorKey,
        rootRef,
        schema
      })
    case 'object':
      return new TsObject({
        context,
        destinationPath,
        value: schema,
        modifiers,
        generatorKey,
        rootRef
      })
    case 'union':
      return new TsUnion({
        context,
        destinationPath,
        members: schema.members,
        discriminator: schema.discriminator,
        modifiers,
        generatorKey,
        rootRef,
        schema
      })
    case 'intersection':
      return new TsIntersection({ context, destinationPath, modifiers, generatorKey, rootRef, schema })
    case 'number':
      return new TsNumber({ context, modifiers, generatorKey, schema })
    case 'integer':
      return new TsInteger({ context, integerSchema: schema, modifiers, generatorKey })
    case 'boolean':
      return new TsBoolean({ context, booleanSchema: schema, modifiers, generatorKey })
    case 'void':
      return new TsVoid({ context, generatorKey })
    case 'string':
      return new TsString({ context, stringSchema: schema, modifiers, generatorKey })
    case 'unknown':
      return new TsUnknown({ context, generatorKey, schema })
    default: {
      const _exhaustive: never = schema
      throw new Error(`Unhandled schema type: ${Reflect.get(_exhaustive, 'type')}`)
    }
  }
}
