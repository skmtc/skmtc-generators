import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import { ArktypeUnknown } from '../../src/ArktypeUnknown.ts'
import { toGenerateContext } from '../helpers/toGenerateContext.ts'
import { toParseContext } from '../helpers/toParseContext.ts'
import { toGeneratorOnlyKey } from '@skmtc/core'
import { arktypeEntry } from '../../src/mod.ts'

Deno.test('ArktypeUnknown - basic unknown type', () => {
  const parseContext = toParseContext()
  const oasDocument = parseContext.parse()
  const context = toGenerateContext({ oasDocument })

  const arktypeUnknown = new ArktypeUnknown({
    context,
    destinationPath: '/test',
    generatorKey: toGeneratorOnlyKey({ generatorId: arktypeEntry.id })
  })

  assertEquals(arktypeUnknown.toString(), 'type("unknown")')
})