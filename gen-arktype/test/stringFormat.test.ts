/**
 * Pins how the string format and pattern fixtures render. The typecheck task
 * checks that the files compile and check; this runs in the default task.
 */
import { assertEquals, assertStringIncludes } from '@std/assert'
import { patternDocument, runE2eFixture, stringFormatDocument } from '@skmtc/test-support'
import { arktypeEntry } from '../src/mod.ts'

const generate = (document: typeof stringFormatDocument) =>
  runE2eFixture({ id: '@skmtc/gen-arktype', entry: arktypeEntry, document }).artifacts

Deno.test('stringFormat - each model renders its format check, pattern or plain string', () => {
  const artifacts = generate(stringFormatDocument)

  const expected: Array<[string, string]> = [
    ['dateTime', 'type("string")'],
    ['date', 'type("string")'],
    ['duration', 'type("string")'],
    ['email', 'type("string.email")'],
    ['uri', 'type("string.url")'],
    ['uuid', 'type("string")'],
    ['ipv4', 'type("string.ip.v4")'],
    ['ipv6', 'type("string.ip.v6")'],
    ['uriTemplate', 'type("string")'],
    ['slug', 'type(["string", "&", /^[a-z]+(-[a-z]+)*$/u])'],
    ['workEmail', 'type(["(string.email <= 20)", "&", /@example\\.com$/u])']
  ]

  assertEquals(Object.keys(artifacts).length, expected.length)

  for (const [name, schema] of expected) {
    assertStringIncludes(artifacts[`src/types/${name}.generated.ts`], `export const ${name} = ${schema}`)
  }
})

Deno.test('stringFormat - a pattern JavaScript rejects is a comment, and the file still renders', () => {
  const artifacts = generate(patternDocument)

  assertStringIncludes(
    artifacts['src/types/code.generated.ts'],
    "pattern '(?i)abc' is not a JavaScript regex, so it is not checked"
  )
  // `*/` in the pattern would end the comment early.
  assertStringIncludes(artifacts['src/types/account.generated.ts'], "pattern '(?i)x*\\/' is not a JavaScript regex")
  assertStringIncludes(artifacts['src/types/url.generated.ts'], 'type(["string", "&", /^https:\\/\\//u])')
  assertStringIncludes(artifacts['src/types/letters.generated.ts'], 'type(["string", "&", /^\\p{L}+$/u])')
})
