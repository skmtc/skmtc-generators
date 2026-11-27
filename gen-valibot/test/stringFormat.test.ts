/**
 * Pins how the string format and pattern fixtures render. The typecheck task
 * checks that the files compile and parse; this runs in the default task.
 */
import { assertEquals, assertStringIncludes } from '@std/assert'
import { patternDocument, runE2eFixture, stringFormatDocument } from '@skmtc/test-support'
import { valibotEntry } from '../src/mod.ts'

const generate = (document: typeof stringFormatDocument) =>
  runE2eFixture({ id: '@skmtc/gen-valibot', entry: valibotEntry, document }).artifacts

Deno.test('stringFormat - each model renders its format check, pattern or plain string', () => {
  const artifacts = generate(stringFormatDocument)

  const expected: Array<[string, string]> = [
    ['dateTime', 'v.pipe(v.string(), v.isoTimestamp())'],
    ['date', 'v.pipe(v.string(), v.isoDate())'],
    ['duration', 'v.string()'],
    ['email', 'v.pipe(v.string(), v.email())'],
    ['uri', 'v.pipe(v.string(), v.url())'],
    ['uuid', 'v.pipe(v.string(), v.uuid())'],
    ['ipv4', 'v.pipe(v.string(), v.ipv4())'],
    ['ipv6', 'v.pipe(v.string(), v.ipv6())'],
    ['uriTemplate', 'v.string()'],
    ['slug', 'v.pipe(v.string(), v.regex(/^[a-z]+(-[a-z]+)*$/u))'],
    ['workEmail', 'v.pipe(v.string(), v.email(), v.maxLength(20), v.regex(/@example\\.com$/u))']
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
  assertStringIncludes(artifacts['src/types/url.generated.ts'], 'v.pipe(v.string(), v.regex(/^https:\\/\\//u))')
  assertStringIncludes(artifacts['src/types/letters.generated.ts'], 'v.pipe(v.string(), v.regex(/^\\p{L}+$/u))')
})
