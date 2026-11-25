// gen-tanstack-query-fetch-zod and gen-tanstack-query-supabase-zod each have a
// copy of this file. test-support checks that the copies are the same.
import { OasObject } from '@skmtc/core'
import type { OasRef, OasSchema } from '@skmtc/core'

/**
 * The object a schema is: an object, or an intersection of objects with the
 * properties of all of them. `undefined` for any other schema. Of a property
 * that two members have, the last that says what it is.
 */
export const toObjectSchema = (schemaOrRef: OasSchema | OasRef<'schema'>): OasObject | undefined => {
  const schema = schemaOrRef.resolve()

  if (schema.type === 'object') {
    return schema
  }

  if (schema.type !== 'intersection') {
    return undefined
  }

  // Any value (`{ description }`) adds nothing.
  const parts = schema.toParts().filter(part => part.type !== 'unknown')
  const objects = parts.filter(part => part.type === 'object')

  if (objects.length === 0 || objects.length !== parts.length) {
    return undefined
  }

  const properties = objects.reduce<NonNullable<OasObject['properties']>>((acc, object) => {
    const known = Object.entries(object.properties ?? {}).filter(
      ([key, property]) => property.type !== 'unknown' || !Object.hasOwn(acc, key)
    )

    return { ...acc, ...Object.fromEntries(known) }
  }, {})

  const object = new OasObject({
    title: schema.title,
    description: schema.description,
    nullable: schema.nullable,
    properties,
    required: [...new Set(objects.flatMap(({ required }) => required ?? []))],
    extensionFields: schema.extensionFields
  })
  object.stackTrail = schema.stackTrail

  return object
}
