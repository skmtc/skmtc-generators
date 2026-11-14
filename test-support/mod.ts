/**
 * Shared end-to-end fixtures for the generators' tests: small documents, one
 * Parse → Generate → Render run over them, and checks on the run's results.
 *
 * Private and never published — the release script skips `private: true`
 * members — so it holds test code only.
 */
import { assert, assertEquals } from '@std/assert'
import { StackTrail, toArtifacts } from '@skmtc/core'
import type { ResultsItem, ResultType } from '@skmtc/core'
import type { OpenAPIV3 } from 'openapi-types'

type ToArtifactsArgs = Parameters<typeof toArtifacts>[0]

/** A generator entry, as `toArtifacts` expects it in the config map. */
export type GeneratorEntry = ReturnType<ToArtifactsArgs['toGeneratorConfigMap']>[string]

/** Two models with a cross-file ref, so the user file has to import the status file. */
export const modelDocument: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'Fixture API', version: '1.0.0' },
  paths: {},
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          status: { $ref: '#/components/schemas/Status' }
        },
        required: ['id', 'status']
      },
      Status: { type: 'string', enum: ['active', 'inactive'] }
    }
  }
}

/** A list and a create operation over two models. */
export const operationDocument: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'Fixture API', version: '1.0.0' },
  paths: {
    '/users': {
      get: {
        responses: {
          '200': {
            description: 'Every user',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/User' } }
              }
            }
          }
        }
      },
      post: {
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/NewUser' } } }
        },
        responses: {
          '201': {
            description: 'The created user',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: { id: { type: 'string' }, name: { type: 'string' } },
        required: ['id', 'name']
      },
      NewUser: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name']
      }
    }
  }
}

const isDocumentObject = (value: unknown): value is OpenAPIV3.Document =>
  typeof value === 'object' && value !== null && 'openapi' in value && 'info' in value

/**
 * Narrow a 3.2 document to `OpenAPIV3.Document`. The `openapi-types` path
 * item has no `query` key and its example has no `dataValue`.
 */
export const toDocumentObject = (value: unknown, name: string): OpenAPIV3.Document => {
  assert(isDocumentObject(value), `${name} is not an OpenAPI document`)
  return value
}

/** A `head` and a `trace` operation, which some route frameworks have no method for. */
export const headTraceDocument: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'Fixture API', version: '1.0.0' },
  paths: {
    '/ping': {
      head: { responses: { '204': { description: 'Alive' } } },
      trace: { responses: { '200': { description: 'The echoed request' } } }
    }
  }
}

/** A 3.2 document with one `query` operation and nothing else. */
export const queryDocument: OpenAPIV3.Document = toDocumentObject(
  {
    openapi: '3.2.0',
    info: { title: 'Fixture API', version: '1.0.0' },
    paths: {
      '/users/search': {
        query: {
          tags: ['users'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', properties: { name: { type: 'string' } } }
              }
            }
          },
          responses: {
            '200': {
              description: 'The matching users',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { type: 'string' } }
                }
              }
            }
          }
        }
      }
    }
  },
  'queryDocument'
)

/** A 3.2 document whose one response example carries a `dataValue`. */
export const dataValueDocument: OpenAPIV3.Document = toDocumentObject(
  {
    openapi: '3.2.0',
    info: { title: 'Fixture API', version: '1.0.0' },
    paths: {
      '/users': {
        get: {
          responses: {
            '200': {
              description: 'Every user',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { type: 'string' } },
                  examples: {
                    first: { dataValue: ['Ada Lovelace'] }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  'dataValueDocument'
)

/** A 3.2 document whose one response example carries only a `serializedValue`. */
export const serializedValueDocument: OpenAPIV3.Document = toDocumentObject(
  {
    openapi: '3.2.0',
    info: { title: 'Fixture API', version: '1.0.0' },
    paths: {
      '/users': {
        get: {
          responses: {
            '200': {
              description: 'Every user',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { type: 'string' } },
                  examples: {
                    first: { serializedValue: '["Grace Hopper"]' }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  'serializedValueDocument'
)

/** A 3.2 document whose one response example is an explicit `null`. */
export const nullExampleDocument: OpenAPIV3.Document = toDocumentObject(
  {
    openapi: '3.2.0',
    info: { title: 'Fixture API', version: '1.0.0' },
    paths: {
      '/current-user': {
        get: {
          responses: {
            '200': {
              description: 'The signed-in user, or null',
              content: {
                'application/json': {
                  schema: { type: 'string' },
                  examples: {
                    signedOut: { dataValue: null }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  'nullExampleDocument'
)

/**
 * A `GET /users` whose success response offers one media type, such as
 * `application/vnd.api+json` or `*\/*`, to check which body a generator reads.
 */
export const toMediaTypeDocument = (
  mediaType: string,
  mediaTypeObject: OpenAPIV3.MediaTypeObject
): OpenAPIV3.Document => ({
  openapi: '3.0.0',
  info: { title: 'Fixture API', version: '1.0.0' },
  paths: {
    '/users': {
      get: {
        responses: {
          '200': { description: 'Every user', content: { [mediaType]: mediaTypeObject } }
        }
      }
    }
  }
})

type RunE2eFixtureArgs = {
  /** The generator's package name, which keys it in the config map. */
  id: string
  entry: GeneratorEntry
  document: OpenAPIV3.Document
}

/** Run one generator over `document` with `basePath: './src'`. */
export const runE2eFixture = ({ id, entry, document }: RunE2eFixtureArgs): ReturnType<typeof toArtifacts> =>
  toArtifacts({
    traceId: `${id}-e2e`,
    spanId: 'fixture',
    startAt: Date.now(),
    document: { type: 'oas', value: document },
    settings: { basePath: './src' },
    stackTrail: new StackTrail([]),
    silent: true,
    // @ts-expect-error - the map is generic over the enrichment type; one entry is not
    toGeneratorConfigMap: () => ({ [id]: entry })
  })

/**
 * Every `ResultType` leaf in a manifest's results tree — the VALUES
 * only. The tree's keys are subject paths and methods, one level each
 * (`/error-logs` → `get`), and destination paths
 * (`ApiError.generated.kt`), so matching a substring
 * against the serialized tree reports an error for any document whose
 * own names contain one.
 */
export const toResultTypes = (results: ResultsItem): ResultType[] => {
  return Object.values(results).flatMap(value => {
    if (value === null) {
      return []
    }

    if (typeof value === 'string') {
      return [value]
    }

    if (Array.isArray(value)) {
      return value.flatMap(item => (item === null ? [] : toResultTypes(item)))
    }

    return toResultTypes(value)
  })
}

/**
 * A generate-phase throw lands in `manifest.results.generate` as a
 * per-subject `error`, and fails the run: `parseIssues` gets a
 * `RUN_FAILED` issue and no file renders.
 */
export const assertNoResultErrors = (manifest: { results: ResultsItem }): void => {
  assertEquals(toResultTypes(manifest.results).filter(result => result === 'error'), [])
}

/** The inverse gate: a run that MUST fail its subjects. */
export const assertHasResultError = (manifest: { results: ResultsItem }): void => {
  assertEquals(toResultTypes(manifest.results).includes('error'), true)
}

/**
 * Every recursive shape a model generator has to defer: two objects that
 * refer to each other (Employee, Team, with boolean, integer and number
 * enums on the model the cycle refers back to), an object that refers to itself
 * (TreeNode), a model that refers into the cycle from outside it
 * (Directory), a union of objects in a cycle (Shape, Group), a union that
 * refers to itself with no object on the way (JsonValue), an array model in
 * a cycle with an object (Crew, Person), and a record that holds itself
 * (Bag).
 */
export const cycleDocument: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: { title: 'Cycle fixture', version: '1.0.0' },
  paths: {},
  components: {
    schemas: {
      Employee: {
        type: 'object',
        required: ['name', 'role'],
        properties: {
          name: { type: 'string' },
          role: { type: 'string', enum: ['engineer', 'manager'] },
          nickname: { type: 'string', nullable: true },
          team: { $ref: '#/components/schemas/Team' },
          // Enums gen-typescript types as literals (`true`, `1 | 2 | 3`):
          // an annotation from that type checks the schema against them.
          active: { type: 'boolean', enum: [true] },
          level: { type: 'integer', enum: [1, 2, 3] },
          weight: { type: 'number', enum: [0.5, 1] }
        }
      },
      Team: {
        type: 'object',
        required: ['members'],
        properties: {
          members: { type: 'array', items: { $ref: '#/components/schemas/Employee' } },
          labels: { type: 'object', additionalProperties: { type: 'string' } }
        }
      },
      TreeNode: {
        type: 'object',
        required: ['value'],
        properties: {
          value: { type: 'string' },
          children: { type: 'array', items: { $ref: '#/components/schemas/TreeNode' } }
        }
      },
      Directory: {
        type: 'object',
        required: ['lead'],
        properties: { lead: { $ref: '#/components/schemas/Employee' } }
      },
      Shape: {
        oneOf: [{ $ref: '#/components/schemas/Circle' }, { $ref: '#/components/schemas/Group' }]
      },
      Circle: {
        type: 'object',
        required: ['kind', 'radius'],
        properties: { kind: { type: 'string', enum: ['circle'] }, radius: { type: 'number' } }
      },
      Group: {
        type: 'object',
        required: ['kind', 'children'],
        properties: {
          kind: { type: 'string', enum: ['group'] },
          children: { type: 'array', items: { $ref: '#/components/schemas/Shape' } }
        }
      },
      JsonValue: {
        oneOf: [
          { type: 'string' },
          { type: 'number' },
          { type: 'boolean' },
          { type: 'array', items: { $ref: '#/components/schemas/JsonValue' } },
          { type: 'object', additionalProperties: { $ref: '#/components/schemas/JsonValue' } }
        ]
      },
      Person: {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string' }, crew: { $ref: '#/components/schemas/Crew' } }
      },
      Crew: { type: 'array', items: { $ref: '#/components/schemas/Person' } },
      Bag: { type: 'object', additionalProperties: { $ref: '#/components/schemas/Bag' } }
    }
  }
}

const toKind = (kind: string): OpenAPIV3.SchemaObject => ({ type: 'string', enum: [kind] })

/**
 * Discriminated unions whose members a validator's discriminated form may
 * not take: members that can (Pet), a nullable member (EnvVar, from
 * Cloudflare's `pages_env_vars`), a key with no literal value (Item, from
 * Cloudflare's `mcn_list_item`), a union inside a cycle (Shape, Group), and
 * a member that is recursive on its own (Tree, Branch).
 */
export const unionDocument: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: { title: 'Union fixture', version: '1.0.0' },
  paths: {},
  components: {
    schemas: {
      Pet: {
        oneOf: [{ $ref: '#/components/schemas/Cat' }, { $ref: '#/components/schemas/Dog' }],
        discriminator: { propertyName: 'type' }
      },
      Cat: { type: 'object', required: ['type'], properties: { type: toKind('cat'), meows: { type: 'boolean' } } },
      Dog: { type: 'object', required: ['type'], properties: { type: toKind('dog'), barks: { type: 'boolean' } } },
      EnvVar: {
        oneOf: [{ $ref: '#/components/schemas/PlainText' }, { $ref: '#/components/schemas/SecretText' }],
        discriminator: { propertyName: 'type' }
      },
      PlainText: {
        type: 'object',
        nullable: true,
        required: ['type', 'value'],
        properties: { type: toKind('plain_text'), value: { type: 'string' } }
      },
      SecretText: {
        type: 'object',
        required: ['type', 'value'],
        properties: { type: toKind('secret_text'), value: { type: 'string' } }
      },
      Item: {
        oneOf: [{ $ref: '#/components/schemas/Link' }, { $ref: '#/components/schemas/Note' }],
        discriminator: {
          propertyName: 'item_type',
          mapping: { link: '#/components/schemas/Link', note: '#/components/schemas/Note' }
        }
      },
      Link: {
        type: 'object',
        required: ['item_type', 'href'],
        properties: { item_type: { type: 'string' }, href: { type: 'string' } }
      },
      Note: {
        type: 'object',
        required: ['item_type', 'text'],
        properties: { item_type: { type: 'string' }, text: { type: 'string' } }
      },
      Shape: {
        oneOf: [{ $ref: '#/components/schemas/Circle' }, { $ref: '#/components/schemas/Group' }],
        discriminator: { propertyName: 'kind' }
      },
      Circle: {
        type: 'object',
        required: ['kind', 'radius'],
        properties: { kind: toKind('circle'), radius: { type: 'number' } }
      },
      Group: {
        type: 'object',
        required: ['kind', 'children'],
        properties: { kind: toKind('group'), children: { type: 'array', items: { $ref: '#/components/schemas/Shape' } } }
      },
      Tree: {
        oneOf: [{ $ref: '#/components/schemas/Leaf' }, { $ref: '#/components/schemas/Branch' }],
        discriminator: { propertyName: 'kind' }
      },
      Leaf: { type: 'object', required: ['kind'], properties: { kind: toKind('leaf'), value: { type: 'string' } } },
      Branch: {
        type: 'object',
        required: ['kind', 'branches'],
        properties: { kind: toKind('branch'), branches: { type: 'array', items: { $ref: '#/components/schemas/Branch' } } }
      }
    }
  }
}

/**
 * Objects with `properties` and `additionalProperties` together (#101).
 * `additionalProperties` covers only the keys `properties` does not name:
 * any value beside named keys (Upload, from Sentry's snapshot upload body),
 * a typed record beside named keys of other types (Limits), a named key that
 * is not a plain word (Dotted), and a model that holds itself in its record
 * beside a named key (Tree), which a validator defers.
 */
export const additionalPropertiesDocument: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: { title: 'Additional properties fixture', version: '1.0.0' },
  paths: {},
  components: {
    schemas: {
      Upload: {
        type: 'object',
        required: ['app_id', 'images'],
        properties: { app_id: { type: 'string' }, images: { type: 'array', items: { type: 'string' } } },
        additionalProperties: true
      },
      Limits: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' }, note: { type: 'string' } },
        additionalProperties: { type: 'number' }
      },
      Dotted: {
        type: 'object',
        required: ['a.b'],
        properties: { 'a.b': { type: 'string' } },
        additionalProperties: { type: 'number' }
      },
      Tree: {
        type: 'object',
        required: ['label'],
        properties: { label: { type: 'string' } },
        additionalProperties: { $ref: '#/components/schemas/Tree' }
      }
    }
  }
}

/**
 * Schema names that are not valid bindings as a generator spells them. A
 * decapitalizing generator turns `Default` and `Delete` into reserved words,
 * and `2FA` starts with a digit in every generator. `Account` refers to all
 * three, so its file has to import each one by its repaired name.
 */
export const awkwardNamesDocument: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: { title: 'Awkward names fixture', version: '1.0.0' },
  paths: {},
  components: {
    schemas: {
      Default: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      Delete: { type: 'string' },
      '2FA': { type: 'boolean' },
      Account: {
        type: 'object',
        required: ['settings', 'mode', 'secondFactor'],
        properties: {
          settings: { $ref: '#/components/schemas/Default' },
          mode: { $ref: '#/components/schemas/Delete' },
          secondFactor: { $ref: '#/components/schemas/2FA' }
        }
      }
    }
  }
}

/**
 * `pattern` values a generator writes as regex literals: a slash that would
 * end the literal (Url), a pattern written for another engine (Code, `(?i)`),
 * one that ends in a backslash (Escape), one that means letters only under
 * the `u` flag (Letters), one valid only without it (Dash), and on one object
 * an invalid pattern that holds `*\/` beside a valid one with a slash in a
 * class (Account).
 */
export const patternDocument: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: { title: 'Pattern fixture', version: '1.0.0' },
  paths: {},
  components: {
    schemas: {
      Url: { type: 'string', pattern: '^https://' },
      Code: { type: 'string', pattern: '(?i)abc' },
      Escape: { type: 'string', pattern: 'abc\\' },
      Letters: { type: 'string', pattern: '^\\p{L}+$' },
      Dash: { type: 'string', pattern: '^a\\-b$' },
      Account: {
        type: 'object',
        required: ['code', 'name'],
        properties: {
          code: { type: 'string', pattern: '(?i)x*/' },
          name: { type: 'string', pattern: '^[a-z/]+$' }
        }
      }
    }
  }
}

/** A value, and whether a validator of `additionalPropertiesDocument` should accept it. */
export type AdditionalPropertiesCase = {
  name: string
  model: 'Upload' | 'Limits' | 'Dotted' | 'Tree'
  value: Record<string, unknown>
  accept: boolean
}

/**
 * What a validator generated from `additionalPropertiesDocument` should
 * accept. A test writes them into a consumer of the generated files, which
 * throws when a validator gets one wrong.
 */
export const additionalPropertiesCases: AdditionalPropertiesCase[] = [
  { name: 'an extra key of any type', model: 'Upload', value: { app_id: 'x', images: [], other: { a: 1 } }, accept: true },
  { name: 'the required keys missing', model: 'Upload', value: { other: 1 }, accept: false },
  { name: 'a string id beside number extras', model: 'Limits', value: { id: 'x', count: 1 }, accept: true },
  { name: 'an optional string beside number extras', model: 'Limits', value: { id: 'x', note: 'n', count: 1 }, accept: true },
  { name: 'an extra key that is not a number', model: 'Limits', value: { id: 'x', count: 'no' }, accept: false },
  { name: 'the required id missing', model: 'Limits', value: { count: 1 }, accept: false },
  { name: 'a dotted key beside number extras', model: 'Dotted', value: { 'a.b': 'x', aXb: 1 }, accept: true },
  // The trap: an unescaped `a.b` pattern matches `aXb`, which then skips the record check.
  { name: 'an extra key that looks like the dotted key', model: 'Dotted', value: { 'a.b': 'x', aXb: 'no' }, accept: false },
  { name: 'a nested tree as an extra key', model: 'Tree', value: { label: 'root', left: { label: 'leaf' } }, accept: true },
  { name: 'a nested tree without its label', model: 'Tree', value: { label: 'root', left: { other: {} } }, accept: false },
  { name: 'an extra key that is not a tree', model: 'Tree', value: { label: 'root', left: 'text' }, accept: false }
]

export { checkGenerated } from './checkGenerated.ts'
