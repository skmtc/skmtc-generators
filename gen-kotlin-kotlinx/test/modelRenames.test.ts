/**
 * Milestone E gate (spec 28): model renames via
 * `enrichments["@skmtc/gen-kotlin-kotlinx"][refName].main.name` — identifier,
 * FILE, ref sites, and supertype clauses all carry the alias.
 */
import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@^1.0.0'
import { StackTrail, toArtifacts } from '@skmtc/core'
import type { OpenAPIV3 } from 'openapi-types'
import kotlinEntry from '../src/mod.ts'

const documentObject: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'Fixture API', version: '1.0.0' },
  paths: {},
  components: {
    schemas: {
      ListCreditNoteEndpointProductListCreditNotePaginatedResponseModel: {
        type: 'object',
        required: ['items'],
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/CreditNote' } }
        }
      },
      CreditNote: {
        type: 'object',
        description: 'A credit note.',
        required: ['id', 'issuedAt'],
        properties: { id: { type: 'string' }, issuedAt: { type: 'string', format: 'date-time' } }
      },
      Wrapper: {
        type: 'object',
        required: ['page'],
        properties: {
          page: {
            $ref: '#/components/schemas/ListCreditNoteEndpointProductListCreditNotePaginatedResponseModel'
          }
        }
      },
      Animal: {
        oneOf: [{ $ref: '#/components/schemas/Dog' }, { $ref: '#/components/schemas/Cat' }],
        discriminator: { propertyName: 'petType' }
      },
      Dog: {
        type: 'object',
        required: ['petType', 'name'],
        properties: { petType: { type: 'string' }, name: { type: 'string' } }
      },
      Cat: {
        type: 'object',
        required: ['petType', 'name'],
        properties: { petType: { type: 'string' }, name: { type: 'string' } }
      }
    }
  }
}

const runFixture = () => {
  return toArtifacts({
    traceId: 'gen-kotlin-renames',
    spanId: 'fixture',
    startAt: Date.now(),
    document: { type: 'oas', value: documentObject },
    settings: {
      basePath: './app/src/main/kotlin',
      enrichments: {
        '@skmtc/gen-kotlin-kotlinx': {
          _generator: {
            basePackage: 'com.example.api',
            scalars: { 'date-time': 'kotlinx.datetime.Instant' }
          },
          ListCreditNoteEndpointProductListCreditNotePaginatedResponseModel: {
            main: { name: 'CreditNotePage' }
          },
          Animal: { main: { name: 'Pet' } }
        }
      }
    },
    stackTrail: new StackTrail([]),
    silent: true,
    toGeneratorConfigMap: () => ({
      // @ts-expect-error - the factory-emitted entry is monomorphic over EnrichmentType
      '@skmtc/gen-kotlin-kotlinx': kotlinEntry
    })
  })
}

Deno.test('rename hits the identifier, the FILE, and every ref site', () => {
  const { artifacts } = runFixture()
  const paths = Object.keys(artifacts)

  assertEquals(paths.includes('app/src/main/kotlin/com/example/api/CreditNotePage.generated.kt'), true)
  assertEquals(paths.some(p => p.includes('ListCreditNoteEndpoint')), false)

  assertStringIncludes(
    artifacts['app/src/main/kotlin/com/example/api/CreditNotePage.generated.kt'],
    'data class CreditNotePage('
  )
  assertStringIncludes(
    artifacts['app/src/main/kotlin/com/example/api/Wrapper.generated.kt'],
    'val page: CreditNotePage'
  )
})

Deno.test('dotted scalars render the simple name and register the import', () => {
  const { artifacts } = runFixture()
  const creditNote = artifacts['app/src/main/kotlin/com/example/api/CreditNote.generated.kt']

  assertStringIncludes(creditNote, 'import kotlinx.datetime.Instant')
  assertStringIncludes(creditNote, 'val issuedAt: Instant')
})

Deno.test('schema descriptions render as class-level KDoc (through the projection mirror)', () => {
  const { artifacts } = runFixture()

  assertStringIncludes(
    artifacts['app/src/main/kotlin/com/example/api/CreditNote.generated.kt'],
    '/** A credit note. */\n@Serializable\ndata class CreditNote('
  )
})

Deno.test('renaming a sealed parent renames the members\' supertype clause', () => {
  const { artifacts } = runFixture()

  assertStringIncludes(
    artifacts['app/src/main/kotlin/com/example/api/Pet.generated.kt'],
    'sealed interface Pet'
  )
  assertStringIncludes(artifacts['app/src/main/kotlin/com/example/api/Dog.generated.kt'], ') : Pet')
})
