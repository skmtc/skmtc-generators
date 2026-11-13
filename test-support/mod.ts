/**
 * Shared end-to-end fixtures for the generators' tests: small documents, one
 * Parse → Generate → Render run over them, and checks on the run's results.
 *
 * Private and never published — the release script skips `private: true`
 * members — so it holds test code only.
 */
import { assert, assertEquals } from '@std/assert'
import { dirname, join } from '@std/path'
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
 * refer to each other (Employee, Team), an object that refers to itself
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
          team: { $ref: '#/components/schemas/Team' }
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

type CheckGeneratedArgs = {
  /** A run's artifacts, keyed by path under `basePath: './src'`. */
  artifacts: Record<string, string>
  /** What the emitted files import besides `@/`, e.g. `{ zod: 'npm:zod@4.6.7' }`. */
  imports: Record<string, string>
}

const runDeno = async (args: string[]): Promise<{ code: number; output: string }> => {
  const { code, stdout, stderr } = await new Deno.Command('deno', {
    args,
    env: { NO_COLOR: '1' },
    stdout: 'piped',
    stderr: 'piped'
  }).output()

  const decoder = new TextDecoder()

  return { code, output: `${decoder.decode(stdout)}${decoder.decode(stderr)}` }
}

/**
 * Write a run's artifacts to a project of their own, type-check them, then
 * load each file first, in a process of its own: a module of a cycle that
 * reads another model before that model's module has run throws there.
 * Returns what failed, so a passing run is `[]`.
 *
 * Needs write, `run=deno` and net, which the default test tasks do not
 * grant: call it from a `test:typecheck` task.
 */
export const checkGenerated = async ({ artifacts, imports }: CheckGeneratedArgs): Promise<string[]> => {
  const root = await Deno.makeTempDir({ prefix: 'skmtc-generated-' })

  try {
    const config = join(root, 'deno.json')
    const paths = Object.keys(artifacts).toSorted()

    await Deno.writeTextFile(config, JSON.stringify({ imports: { '@/': './src/', ...imports } }))

    for (const path of paths) {
      const target = join(root, path)
      await Deno.mkdir(dirname(target), { recursive: true })
      await Deno.writeTextFile(target, artifacts[path])
    }

    const check = await runDeno(['check', '--quiet', '--config', config, ...paths.map(path => join(root, path))])

    const loads = await Promise.all(
      paths.map(async path => ({
        path,
        load: await runDeno(['run', '--quiet', '--no-check', '--config', config, join(root, path)])
      }))
    )

    return [
      ...(check.code === 0 ? [] : [`deno check failed:\n${check.output}`]),
      ...loads
        .filter(({ load }) => load.code !== 0)
        .map(({ path, load }) => `loading ${path} first failed:\n${load.output}`)
    ]
  } finally {
    await Deno.remove(root, { recursive: true })
  }
}
