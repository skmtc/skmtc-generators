import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ArktypeNull } from '../../src/ArktypeNull.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParseContext } from '../helpers/toParseContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import { arktypeEntry } from '../../src/mod.ts'

Deno.test('ArktypeNull - basic null type', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeNull = new ArktypeNull({
    context,
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeNull.toString(), 'type("null")')
})