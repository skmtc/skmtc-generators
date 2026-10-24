/**
 * Golden snapshot. A kitchen-sink document covering every snippet gen-zod
 * renders is generated and the full output pinned as raw text, so a refactor
 * that changes any rendered byte shows up as a reviewable diff. Regenerate
 * with `UPDATE_GOLDEN=1 deno task test:update` (then review the diff).
 */
import { assertEquals } from '@std/assert'
import { runE2eFixture } from '@skmtc/test-support'
import type { OpenAPIV3 } from 'openapi-types'
import { zodEntry } from '@/src/mod.ts'

const document: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'Kitchen sink', version: '1.0.0' },
  paths: {},
  components: {
    schemas: {
      IntegerPlain: { type: 'integer' },
      IntegerZeroMinimum: { type: 'integer', minimum: 0 },
      IntegerBounds: { type: 'integer', minimum: 1, maximum: 10, multipleOf: 2 },
      IntegerExclusive: {
        type: 'integer',
        minimum: 0,
        exclusiveMinimum: true,
        maximum: 100,
        exclusiveMaximum: true
      },
      IntegerInt64: { type: 'integer', format: 'int64', maximum: 0 },
      IntegerEnum: { type: 'integer', enum: [1, 2, 3] },
      IntegerSingleEnum: { type: 'integer', enum: [7] },
      IntegerNullable: { type: 'integer', nullable: true, minimum: 5 },
      NumberPlain: { type: 'number' },
      NumberBounds: { type: 'number', minimum: -1.5, maximum: 2.5, multipleOf: 0.5 },
      NumberExclusive: {
        type: 'number',
        minimum: 0,
        exclusiveMinimum: true,
        maximum: 1,
        exclusiveMaximum: true
      },
      NumberFloat: { type: 'number', format: 'float' },
      NumberEnum: { type: 'number', enum: [0.5, 1.5] },
      NumberNullable: { type: 'number', nullable: true },
      StringPlain: { type: 'string' },
      StringLengths: { type: 'string', minLength: 0, maxLength: 20 },
      StringPattern: { type: 'string', pattern: '^[a-z]+$' },
      StringEmail: { type: 'string', format: 'email' },
      StringDateTime: { type: 'string', format: 'date-time' },
      StringDate: { type: 'string', format: 'date' },
      StringUuid: { type: 'string', format: 'uuid' },
      StringUri: { type: 'string', format: 'uri' },
      StringEnum: { type: 'string', enum: ['a', 'b'] },
      StringSingleEnum: { type: 'string', enum: ['only'] },
      StringNullable: { type: 'string', nullable: true, minLength: 1 },
      StringNullableEnum: { type: 'string', nullable: true, enum: ['x', 'y'] },
      BooleanPlain: { type: 'boolean' },
      BooleanEnum: { type: 'boolean', enum: [true] },
      BooleanNullable: { type: 'boolean', nullable: true },
      ArrayOfStrings: { type: 'array', items: { type: 'string' } },
      ArrayOfRefs: { type: 'array', items: { $ref: '#/components/schemas/ObjectWithProperties' } },
      ArrayNullable: { type: 'array', nullable: true, items: { type: 'integer', minimum: 0 } },
      ObjectEmpty: { type: 'object' },
      ObjectWithProperties: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          count: { type: 'integer', minimum: 0 },
          label: { type: 'string', nullable: true },
          'kebab-key': { type: 'boolean' },
          '1leading': { type: 'number' },
          nested: {
            type: 'object',
            properties: { inner: { type: 'string' } },
            required: ['inner']
          }
        },
        required: ['id', 'count']
      },
      ObjectAdditionalTrue: { type: 'object', additionalProperties: true },
      ObjectAdditionalSchema: { type: 'object', additionalProperties: { type: 'integer' } },
      ObjectPropertiesAndAdditional: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
        additionalProperties: { type: 'string' }
      },
      ObjectNullable: {
        type: 'object',
        nullable: true,
        properties: { a: { type: 'string' } }
      },
      UnionOneOf: {
        oneOf: [
          { type: 'string' },
          { type: 'integer' },
          { $ref: '#/components/schemas/StringEnum' }
        ]
      },
      UnionAnyOf: { anyOf: [{ type: 'boolean' }, { type: 'number', minimum: 0 }] },
      UnionNullable: {
        nullable: true,
        oneOf: [{ type: 'string' }, { type: 'integer' }]
      },
      Cat: {
        type: 'object',
        properties: { kind: { type: 'string', enum: ['cat'] }, meow: { type: 'boolean' } },
        required: ['kind']
      },
      Dog: {
        type: 'object',
        properties: { kind: { type: 'string', enum: ['dog'] }, bark: { type: 'boolean' } },
        required: ['kind']
      },
      UnionDiscriminated: {
        oneOf: [{ $ref: '#/components/schemas/Cat' }, { $ref: '#/components/schemas/Dog' }],
        discriminator: { propertyName: 'kind' }
      },
      AllOfMerged: {
        allOf: [
          { $ref: '#/components/schemas/ObjectWithProperties' },
          { type: 'object', properties: { extra: { type: 'string' } } }
        ]
      },
      RefAlias: { $ref: '#/components/schemas/StringEnum' },
      TreeNode: {
        type: 'object',
        properties: {
          value: { type: 'string' },
          children: { type: 'array', items: { $ref: '#/components/schemas/TreeNode' } }
        },
        required: ['value']
      },
      Unknown: {}
    }
  }
}

const goldenUrl = new URL('./golden/kitchen-sink.txt', import.meta.url)
const goldenDir = new URL('./golden/', import.meta.url)

/** Concatenate every artifact, path-sorted, under a `==== path ====` header. */
const toCorpus = (artifacts: Record<string, string>): string =>
  Object.keys(artifacts)
    .sort()
    .map(path => `==== ${path} ====\n\n${artifacts[path]}`)
    .join('\n\n')

Deno.test('golden - kitchen-sink output matches the committed golden', async () => {
  const { artifacts } = runE2eFixture({ id: '@skmtc/gen-zod', entry: zodEntry, document })
  const corpus = toCorpus(artifacts)

  if (Deno.env.get('UPDATE_GOLDEN') === '1') {
    await Deno.mkdir(goldenDir, { recursive: true })
    await Deno.writeTextFile(goldenUrl, corpus)

    return
  }

  assertEquals(corpus, await Deno.readTextFile(goldenUrl))
})
