import { assertThrows } from '@std/assert'
import { GenerateContext, OasDocument, OasString } from '@skmtc/core'
import * as log from '@std/log/logger'
import { toEffectValue } from './Effect.ts'
import { needsCoercion } from './coercion.ts'
import { effectSchemaEntry } from './mod.ts'

const toContext = () =>
  new GenerateContext({
    document: { type: 'oas', value: new OasDocument() },
    settings: undefined,
    logger: new log.Logger('test', 'ERROR'),
    captureCurrentResult: () => {},
    // @ts-expect-error - the map is generic over the enrichment type; one entry is not
    toGeneratorConfigMap: () => ({ '@skmtc/gen-effect-schema': effectSchemaEntry })
  })

// As if core had added a type after these were written.
const tuple = () => Object.assign(new OasString({}), { type: 'tuple' })

Deno.test('toEffectValue - a schema type it has no case for fails and names the type', () => {
  assertThrows(
    () =>
      toEffectValue({
        context: toContext(),
        destinationPath: '@/a.generated.ts',
        schema: tuple(),
        required: true,
      }),
    Error,
    'Unhandled schema type: tuple',
  )
})

Deno.test('needsCoercion - a schema type it has no case for fails and names the type', () => {
  assertThrows(() => needsCoercion(tuple()), Error, 'Unhandled schema type: tuple')
})
