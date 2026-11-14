import { assert, assertEquals } from '@std/assert'
import { ValibotProjection } from '../../src/ValibotProjection.ts'
import { type RefName, StackTrail } from '@skmtc/core'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParseContext } from '../helpers/toParseContext.ts'

Deno.test('ValibotProjection - simple object type', () => {
  const schemas = {
    User: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' as const },
        name: { type: 'string' as const }
      },
      required: ['id', 'name']
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const valibotProjection = context.insertModel(ValibotProjection, 'User' as RefName)

  // Should generate an object with required properties
  assertEquals(`${valibotProjection.toValue()}`, 'v.object({id: v.string(), name: v.string()})')
})

Deno.test('ValibotProjection - object with optional properties', () => {
  const schemas = {
    Product: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' as const },
        name: { type: 'string' as const },
        description: { type: 'string' as const }
      },
      required: ['id', 'name']
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const valibotProjection = context.insertModel(ValibotProjection, 'Product' as RefName)

  assertEquals(
    `${valibotProjection.toValue()}`,
    'v.object({id: v.string(), name: v.string(), description: v.optional(v.string())})'
  )
})

Deno.test('ValibotProjection - primitive string type', () => {
  const schemas = {
    UserId: {
      type: 'string' as const
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const valibotProjection = context.insertModel(ValibotProjection, 'UserId' as RefName)

  assertEquals(`${valibotProjection.toValue()}`, 'v.string()')
})

Deno.test('ValibotProjection - array type', () => {
  const schemas = {
    UserList: {
      type: 'array' as const,
      items: {
        type: 'string' as const
      }
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const valibotProjection = context.insertModel(ValibotProjection, 'UserList' as RefName)

  assertEquals(`${valibotProjection.toValue()}`, 'v.array(v.string())')
})

Deno.test('ValibotProjection - union type', () => {
  const schemas = {
    StringOrNumber: {
      oneOf: [{ type: 'string' as const }, { type: 'number' as const }]
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const valibotProjection = context.insertModel(ValibotProjection, 'StringOrNumber' as RefName)

  assertEquals(`${valibotProjection.toValue()}`, 'v.union([v.string(), v.number()])')
})

Deno.test('ValibotProjection - every reference in a cycle of two models is lazy; the model referred back to is typed by gen-typescript', () => {
  const schemas = {
    Employee: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        team: { $ref: '#/components/schemas/Team' }
      },
      required: ['name']
    },
    Team: {
      type: 'object' as const,
      properties: {
        members: { type: 'array' as const, items: { $ref: '#/components/schemas/Employee' } }
      },
      required: ['members']
    }
  }

  const stackTrail = new StackTrail(['TEST'])
  const parseContext = toParseContext({ schemas })
  const oasDocument = parseContext.parse(stackTrail)
  const context = toGenerateContext({ oasDocument })

  const employee = context.insertModel(ValibotProjection, 'Employee' as RefName)
  const team = context.insertModel(ValibotProjection, 'Team' as RefName)

  // The trap: a plain `team` in employee's file reads Team before its module
  // has run when team's file loads first. Any model of a cycle can be first.
  assertEquals(
    `${employee.toValue()}`,
    'v.object({name: v.string(), team: v.optional(v.lazy(() => team))})'
  )
  assertEquals(`${team.toValue()}`, 'v.object({members: v.array(v.lazy(() => employee))})')

  // Unannotated, each `export const` depends on its own initializer through
  // the other (TS7022). Every cycle passes through the model referred back
  // to, so annotating that one breaks it; the type is gen-typescript's, in
  // the file gen-valibot and gen-typescript share.
  assertEquals(employee.toIdentifier().typeName, 'v.GenericSchema<Employee>')
  assertEquals(team.toIdentifier().typeName, undefined)
  assert(
    context.findDefinition({ name: 'Employee', exportPath: '@/types/employee.generated.ts' }),
    "gen-typescript's Employee type should be beside the schema"
  )
})
