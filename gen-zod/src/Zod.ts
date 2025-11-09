import { ZodString } from './ZodString.ts'
import { ZodArray } from './ZodArray.ts'
import { ZodRef } from './ZodRef.ts'
import { ZodObject } from './ZodObject.ts'
import { ZodUnion } from './ZodUnion.ts'
import type { SchemaToValueFn, SchemaType, Modifiers } from '@skmtc/core'
import { ZodNumber } from './ZodNumber.ts'
import { ZodInteger } from './ZodInteger.ts'
import { ZodBoolean } from './ZodBoolean.ts'
import { ZodVoid } from './ZodVoid.ts'
import { ZodUnknown } from './ZodUnknown.ts'
import { toGeneratorOnlyKey, toRefName } from '@skmtc/core'
import { zodEntry } from './mod.ts'

export const toZodValue: SchemaToValueFn = ({
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

  const generatorKey = toGeneratorOnlyKey({ generatorId: zodEntry.id })

  switch (schema.type) {
    case 'custom':
      return schema as any
    case 'ref':
      return new ZodRef({
        context,
        destinationPath,
        refName: toRefName(schema.$ref),
        modifiers,
        rootRef
      })
    case 'array':
      return new ZodArray({
        context,
        destinationPath,
        modifiers,
        items: schema.items,
        generatorKey,
        rootRef
      })
    case 'object':
      return new ZodObject({
        context,
        destinationPath,
        objectSchema: schema,
        modifiers,
        generatorKey,
        rootRef
      })
    case 'union':
      return new ZodUnion({
        context,
        destinationPath,
        members: schema.members,
        discriminator: schema.discriminator,
        modifiers,
        generatorKey,
        rootRef
      })
    case 'number':
      return new ZodNumber({ context, modifiers, destinationPath, generatorKey })
    case 'integer':
      return new ZodInteger({
        context,
        integerSchema: schema,
        modifiers,
        destinationPath,
        generatorKey
      })
    case 'boolean':
      return new ZodBoolean({ context, modifiers, destinationPath, generatorKey })
    case 'void':
      return new ZodVoid({ context, destinationPath, generatorKey })
    case 'string':
      return new ZodString({
        context,
        stringSchema: schema,
        modifiers,
        destinationPath,
        generatorKey
      })
    case 'unknown':
      return new ZodUnknown({ context, destinationPath, generatorKey })
    default: {
      // Exhaustiveness check - if SchemaType is properly defined, this should never happen
      const _exhaustive: never = schema
      throw new Error(`Unhandled schema type: ${(_exhaustive as any).type}`)
    }
  }
}
