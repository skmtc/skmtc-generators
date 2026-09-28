import { assertEquals } from '@std/assert'
import { toFirstSegment } from '../src/toFirstSegment.ts'

Deno.test('toFirstSegment - the first non-empty segment names the folder', () => {
  assertEquals(toFirstSegment({ path: '/users/{id}' }), 'users')
})

Deno.test('toFirstSegment - a path with no segment lands in root, not "undefined"', () => {
  assertEquals(toFirstSegment({ path: '/' }), 'root')
})
