import { assertEquals, assertThrows } from 'jsr:@std/assert@^1.0.0'
import { StackTrail, toSchemaV3 } from '@skmtc/core'
import type { RefName } from '@skmtc/core'
import { KtDataClassValue } from '../src/KtDataClassValue.ts'
import { toParseContext } from './helpers/toParseContext.ts'
import { toGenerateContext } from './helpers/toGenerateContext.ts'

const toDogSchema = () => {
  const parsed = toSchemaV3({
    schema: {
      type: 'object',
      properties: {
        petType: { type: 'string' },
        species: { type: 'string' },
        name: { type: 'string' }
      },
      required: ['petType', 'species', 'name']
    },
    context: toParseContext(),
    stackTrail: new StackTrail(['Dog'])
  })

  if (parsed.isRef() || parsed.type !== 'object') {
    throw new Error('fixture did not parse to an object schema')
  }

  return parsed
}

Deno.test('two same-tag parents compose: both supertypes, one @SerialName, both discriminator properties omitted', () => {
  const value = new KtDataClassValue({
    context: toGenerateContext(),
    objectSchema: toDogSchema(),
    destinationPath: '@/com/example/api/Dog.generated.kt',
    className: 'Dog',
    sealedParents: [
      { parentRefName: 'Animal' as RefName, tag: 'Dog', discriminatorPropertyName: 'petType' },
      { parentRefName: 'Pet' as RefName, tag: 'Dog', discriminatorPropertyName: 'species' }
    ]
  })

  assertEquals(value.supertypes, ['Animal', 'Pet'])
  assertEquals(
    value.annotations.map(annotation => `${annotation}`),
    ['@Serializable', '@SerialName("Dog")']
  )
  assertEquals(`${value}`, '    val name: String')
})

Deno.test('conflicting wire tags across parents throw loudly (one @SerialName per class)', () => {
  assertThrows(
    () =>
      new KtDataClassValue({
        context: toGenerateContext(),
        objectSchema: toDogSchema(),
        destinationPath: '@/com/example/api/Dog.generated.kt',
        className: 'Dog',
        sealedParents: [
          { parentRefName: 'Animal' as RefName, tag: 'dog', discriminatorPropertyName: 'petType' },
          { parentRefName: 'Pet' as RefName, tag: 'doggo', discriminatorPropertyName: 'species' }
        ]
      }),
    Error,
    'conflicting wire tags'
  )
})

Deno.test('omission that empties the class throws the at-least-one-property error', () => {
  const parsed = toSchemaV3({
    schema: {
      type: 'object',
      properties: { petType: { type: 'string' } },
      required: ['petType']
    },
    context: toParseContext(),
    stackTrail: new StackTrail(['Tagged'])
  })

  if (parsed.isRef() || parsed.type !== 'object') {
    throw new Error('fixture did not parse to an object schema')
  }

  assertThrows(
    () =>
      new KtDataClassValue({
        context: toGenerateContext(),
        objectSchema: parsed,
        destinationPath: '@/com/example/api/Tagged.generated.kt',
        className: 'Tagged',
        sealedParents: [
          { parentRefName: 'Animal' as RefName, tag: 'tagged', discriminatorPropertyName: 'petType' }
        ]
      }),
    Error,
    'after discriminator-property omission'
  )
})
