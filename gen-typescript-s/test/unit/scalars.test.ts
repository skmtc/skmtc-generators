import { assertEquals } from 'jsr:@std/assert@^1.0.0'
import {
  getCustomScalar,
  getCustomScalarMap,
  resetCustomScalars,
  setCustomScalars
} from '../../src/scalars.ts'

Deno.test('scalars - undefined format returns undefined', () => {
  resetCustomScalars()
  assertEquals(getCustomScalar(undefined), undefined)
})

Deno.test('scalars - well-known OpenAPI formats default to string', () => {
  resetCustomScalars()
  assertEquals(getCustomScalar('date-time'), 'string')
  assertEquals(getCustomScalar('email'), 'string')
  assertEquals(getCustomScalar('uuid'), 'string')
  assertEquals(getCustomScalar('id'), 'string')
})

Deno.test('scalars - unknown format defaults to unknown', () => {
  resetCustomScalars()
  assertEquals(getCustomScalar('TotallyMadeUp'), 'unknown')
})

Deno.test('scalars - setCustomScalars merges over defaults', () => {
  resetCustomScalars()
  setCustomScalars({ DateTime: 'string', JSON: 'unknown', BigInt: 'bigint' })

  assertEquals(getCustomScalar('DateTime'), 'string')
  assertEquals(getCustomScalar('JSON'), 'unknown')
  assertEquals(getCustomScalar('BigInt'), 'bigint')
  // Defaults still present
  assertEquals(getCustomScalar('email'), 'string')
})

Deno.test('scalars - setCustomScalars with replace=true wipes defaults', () => {
  resetCustomScalars()
  setCustomScalars({ DateTime: 'string' }, { replace: true })

  assertEquals(getCustomScalar('DateTime'), 'string')
  // Default should have been wiped — falls through to 'unknown'
  assertEquals(getCustomScalar('email'), 'unknown')

  // Restore for any later tests in the same run.
  resetCustomScalars()
})

Deno.test('scalars - configured override beats default', () => {
  resetCustomScalars()
  setCustomScalars({ 'date-time': 'Date' })
  assertEquals(getCustomScalar('date-time'), 'Date')
  resetCustomScalars()
})

Deno.test('scalars - getCustomScalarMap snapshot is detached', () => {
  resetCustomScalars()
  const snapshot = getCustomScalarMap()
  setCustomScalars({ X: 'something' })
  // The earlier snapshot must not see the new entry.
  assertEquals('X' in snapshot, false)
  resetCustomScalars()
})
