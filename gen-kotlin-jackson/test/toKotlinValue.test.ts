import { assertThrows } from '@std/assert'
import { GenerateContext, OasDocument, OasString } from '@skmtc/core'
import * as log from '@std/log/logger'
import { toKotlinValue } from '../src/Kotlin.ts'
import { kotlinJacksonEntry } from '../src/mod.ts'

const toContext = () =>
  new GenerateContext({
    document: { type: 'oas', value: new OasDocument() },
    settings: undefined,
    logger: new log.Logger('test', 'ERROR'),
    captureCurrentResult: () => {},
    // @ts-expect-error - the map is generic over the enrichment type; one entry is not
    toGeneratorConfigMap: () => ({ '@skmtc/gen-kotlin-jackson': kotlinJacksonEntry })
  })

Deno.test('toKotlinValue - a schema type it has no case for fails and names the type', () => {
  // As if core had added a type after this router was written.
  const schema = Object.assign(new OasString({}), { type: 'tuple' })

  assertThrows(
    () => toKotlinValue({ context: toContext(), destinationPath: '@/A.generated.kt', schema, required: true }),
    Error,
    'Unhandled schema type: tuple',
  )
})
