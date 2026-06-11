/**
 * Milestone D e2e gate (spec 26): enrichment-driven union hints route
 * undiscriminated unions through the sealed machinery — inline (the
 * synthesized-parent case), top-level, and the loud invalid-hint path.
 */
import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@^1.0.0'
import { StackTrail, toArtifacts } from '@skmtc/core'
import type { OpenAPIV3 } from 'openapi-types'
import { toKotlinEntry } from '../src/mod.ts'

const documentObject: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'Fixture API', version: '1.0.0' },
  paths: {},
  components: {
    schemas: {
      ListPrice: {
        type: 'object',
        required: ['id', 'structure'],
        properties: {
          id: { type: 'string' },
          structure: {
            oneOf: [
              { $ref: '#/components/schemas/GraduatedPricingStructure' },
              { $ref: '#/components/schemas/FixedPricingStructure' }
            ]
          }
        }
      },
      GraduatedPricingStructure: {
        type: 'object',
        required: ['pricingType', 'usageMetricId'],
        properties: {
          pricingType: { $ref: '#/components/schemas/GraduatedPricingType' },
          usageMetricId: { type: 'string' }
        }
      },
      FixedPricingStructure: {
        type: 'object',
        required: ['pricingType', 'price'],
        properties: {
          pricingType: { $ref: '#/components/schemas/FixedPricingType' },
          price: { type: 'string' }
        }
      },
      GraduatedPricingType: { type: 'string', enum: ['GRADUATED'] },
      FixedPricingType: { type: 'string', enum: ['FIXED'] },
      Animal: {
        oneOf: [
          { $ref: '#/components/schemas/Dog' },
          { $ref: '#/components/schemas/Cat' }
        ]
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
      },
      Broken: {
        type: 'object',
        required: ['payload'],
        properties: {
          payload: {
            oneOf: [
              { $ref: '#/components/schemas/Dog' },
              { $ref: '#/components/schemas/NoTag' }
            ]
          }
        }
      },
      NoTag: {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string' } }
      }
    }
  }
}

const runFixture = () => {
  const kotlinEntry = toKotlinEntry({ basePackage: 'com.example.api' })

  return toArtifacts({
    traceId: 'gen-kotlin-union-hints',
    spanId: 'fixture',
    startAt: Date.now(),
    document: { type: 'oas', value: documentObject },
    settings: {
      basePath: './app/src/main/kotlin',
      enrichments: {
        '@skmtc/gen-kotlin': {
          ListPrice: {
            main: {
              properties: {
                structure: {
                  name: 'PricingStructure',
                  discriminator: { propertyName: 'pricingType' }
                }
              }
            }
          },
          Animal: { main: { discriminator: { propertyName: 'petType' } } },
          Broken: {
            main: {
              properties: {
                payload: {
                  name: 'BrokenPayload',
                  discriminator: { propertyName: 'missingTag' }
                }
              }
            }
          }
        }
      }
    },
    stackTrail: new StackTrail([]),
    silent: true,
    toGeneratorConfigMap: () => ({
      // @ts-expect-error - the factory-emitted entry is monomorphic over EnrichmentType
      '@skmtc/gen-kotlin': kotlinEntry
    })
  })
}

Deno.test('inline hint synthesizes the sealed parent and types the property', () => {
  const { artifacts } = runFixture()

  assertEquals(
    artifacts['app/src/main/kotlin/com/example/api/PricingStructure.generated.kt'],
    'package com.example.api\n' +
      '\n' +
      'import kotlinx.serialization.ExperimentalSerializationApi\n' +
      'import kotlinx.serialization.Serializable\n' +
      'import kotlinx.serialization.json.JsonClassDiscriminator\n' +
      '\n' +
      '@OptIn(ExperimentalSerializationApi::class)\n' +
      '@Serializable\n' +
      '@JsonClassDiscriminator("pricingType")\n' +
      'sealed interface PricingStructure\n'
  )

  assertEquals(
    artifacts['app/src/main/kotlin/com/example/api/ListPrice.generated.kt'],
    'package com.example.api\n' +
      '\n' +
      'import kotlinx.serialization.Serializable\n' +
      '\n' +
      '@Serializable\n' +
      'data class ListPrice(\n' +
      '    val id: String,\n' +
      '    val structure: PricingStructure\n' +
      ')\n'
  )
})

Deno.test('hinted members gain the supertype clause, de facto enum tag, and property omission', () => {
  const { artifacts } = runFixture()

  assertEquals(
    artifacts['app/src/main/kotlin/com/example/api/GraduatedPricingStructure.generated.kt'],
    'package com.example.api\n' +
      '\n' +
      'import kotlinx.serialization.SerialName\n' +
      'import kotlinx.serialization.Serializable\n' +
      '\n' +
      '@Serializable\n' +
      '@SerialName("GRADUATED")\n' +
      'data class GraduatedPricingStructure(\n' +
      '    val usageMetricId: String\n' +
      ') : PricingStructure\n'
  )
})

Deno.test('top-level hint routes the union to a sealed interface; members tag by refName', () => {
  const { artifacts } = runFixture()

  assertEquals(
    artifacts['app/src/main/kotlin/com/example/api/Animal.generated.kt'],
    'package com.example.api\n' +
      '\n' +
      'import kotlinx.serialization.ExperimentalSerializationApi\n' +
      'import kotlinx.serialization.Serializable\n' +
      'import kotlinx.serialization.json.JsonClassDiscriminator\n' +
      '\n' +
      '@OptIn(ExperimentalSerializationApi::class)\n' +
      '@Serializable\n' +
      '@JsonClassDiscriminator("petType")\n' +
      'sealed interface Animal\n'
  )

  const dog = artifacts['app/src/main/kotlin/com/example/api/Dog.generated.kt']
  assertStringIncludes(dog, '@SerialName("Dog")')
  assertStringIncludes(dog, ') : Animal')
})

Deno.test('an invalid hint fails its item loudly instead of falling back silently', () => {
  const { artifacts, manifest } = runFixture()

  // Broken's transform threw (NoTag lacks 'missingTag') — its Definition
  // never registered. The file remains as import-only residue (the
  // Driver creates it before value construction; engine fail-open).
  const broken = artifacts['app/src/main/kotlin/com/example/api/Broken.generated.kt'] ?? ''
  assertEquals(broken.includes('data class Broken'), false)

  // The run continued: everything else rendered.
  assertEquals(
    Object.keys(artifacts).filter(path => path.endsWith('PricingStructure.generated.kt')).length,
    3 // PricingStructure + Graduated/Fixed members
  )

  assertEquals(manifest.parseIssues.filter(issue => issue.level === 'error'), [])
})
