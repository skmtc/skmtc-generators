import { ValibotString } from './ValibotString.ts'
import { ValibotArray } from './ValibotArray.ts'
import { ValibotRef } from './ValibotRef.ts'
import { ValibotObject } from './ValibotObject.ts'
import { ValibotUnion } from './ValibotUnion.ts'
import type { SchemaToValueFn, SchemaType, Modifiers } from '@skmtc/core'
import { ValibotNumber } from './ValibotNumber.ts'
import { ValibotInteger } from './ValibotInteger.ts'
import { ValibotBoolean } from './ValibotBoolean.ts'
import { ValibotVoid } from './ValibotVoid.ts'
import { ValibotUnknown } from './ValibotUnknown.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import { valibotEntry } from './mod.ts'

export const toValibotValue: SchemaToValueFn = ({
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
    nullable: 'nullable' in schema ? schema.nullable : undefined
  }

  const generatorKey = toGeneratorOnlyKey({ generatorId: valibotEntry.id })

  switch (schema.type) {
    case 'custom':
      return schema
    case 'ref':
      return new ValibotRef({
        context,
        destinationPath,
        ref: schema,
        modifiers,
        generatorKey,
        rootRef,
        schema
      })
    case 'array':
      return new ValibotArray({
        context,
        destinationPath,
        modifiers,
        items: schema.items,
        generatorKey,
        rootRef,
        schema
      })
    case 'object':
      return new ValibotObject({
        context,
        destinationPath,
        objectSchema: schema,
        modifiers,
        generatorKey,
        rootRef
      })
    case 'union':
      return new ValibotUnion({
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
      return new ValibotNumber({ context, modifiers, destinationPath, generatorKey, schema })
    case 'integer':
      return new ValibotInteger({ context, integerSchema: schema, modifiers, destinationPath, generatorKey })
    case 'boolean':
      return new ValibotBoolean({ context, modifiers, destinationPath, generatorKey, schema })
    case 'void':
      return new ValibotVoid({ context, destinationPath, generatorKey })
    case 'string':
      return new ValibotString({ context, stringSchema: schema, modifiers, destinationPath, generatorKey })
    case 'unknown':
      return new ValibotUnknown({ context, destinationPath, generatorKey, schema })
    default: {
      const _exhaustive: never = schema
      throw new Error(`Unhandled schema type: ${_exhaustive}`)
    }
  }
}