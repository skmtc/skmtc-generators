import type { GenerateContext, SchemaType } from '@skmtc/core'

export function createMockContext(): GenerateContext {
  return {
    modelDepth: { '@skmtc/gen-typescript': 0 },
    insertModel: () => {},
    toModelContentSettings: (args: any) => ({
      identifier: { name: args.refName || 'TestType' },
      exportPath: '/test'
    }),
    resolveSchemaRefOnce: (refName: string) => {
      // Mock schema resolution for common test refs
      if (refName === 'User') {
        return createSchema('object', { properties: { name: createSchema('string') } })
      }
      if (refName === 'Post') {
        return createSchema('object', { properties: { title: createSchema('string') } })
      }
      return createSchema('unknown')
    },
  } as any
}

export function createSchema(type: string, options: any = {}): SchemaType {
  const base = {
    oasType: 'schema',
    title: `${type} schema`,
    description: `A ${type} type`,
    format: undefined,
    nullable: options.nullable,
    discriminator: options.discriminator,
    members: options.members,
    items: options.items,
    properties: options.properties,
    required: options.required,
    additionalProperties: options.additionalProperties,
    enums: options.enums,
    $ref: options.$ref,
    type: type as any
  }
  
  return base as SchemaType
}