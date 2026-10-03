import { capitalize, OasVoid } from '@skmtc/core'
import type {
  IdentifierBase,
  OasOperationProjectionConstructorArgs,
} from '@skmtc/core'
import { EffectProjection } from '@skmtc/gen-effect-schema'
import { List, type ListParams, toTsIdentifier } from '@skmtc/lang-typescript'
import { EffectHttpBase } from './base.ts'
import type { EnrichmentSchema } from './enrichments.ts'
import { EffectRequest } from './EffectRequest.ts'
import { ResponseRead } from './ResponseRead.ts'
import { ResponseVoid } from './ResponseVoid.ts'
import { TypedParameter } from './TypedParameter.ts'

/**
 * One operation as an Effect: a function of the operation's params (path,
 * query and header parameters as one object) and its JSON body, returning
 * `Effect<Response, HttpClientError | SchemaError, HttpClient>`. The request
 * is built with `HttpClientRequest`, sent through whatever `HttpClient` the
 * caller provides — base URL, auth, retries and status filtering are that
 * layer's — and the answer decoded with the response schema. The three
 * schemas are peer definitions from gen-effect-schema, referenced by NAME.
 *
 * An argument the operation has no use for is not in the signature: no
 * parameters, no `params`; no JSON body, no `body`. A response the document
 * gives no body for is not read.
 */
export class EffectEndpoint extends EffectHttpBase {
  parameters: ListParams<TypedParameter>
  request: EffectRequest
  response: ResponseRead | ResponseVoid

  constructor(
    { context, operation, settings }: OasOperationProjectionConstructorArgs<
      EnrichmentSchema
    >,
  ) {
    super({ context, operation, settings })

    const name = capitalize(settings.identifier.name)
    const destinationPath = settings.exportPath

    const hasParams = operation.toParams(['path', 'query', 'header']).length > 0

    const params = this.insertNormalizedModel(EffectProjection, {
      schema: operation.toParametersObject(),
      fallbackName: `${name}Params`,
    }).identifier

    const bodySchema = operation.toRequestBody(({ schema }) => schema)

    const body = bodySchema === undefined ? null : this.insertNormalizedModel(
      EffectProjection,
      { schema: bodySchema, fallbackName: `${name}Body` },
    ).identifier

    const responseSchema = operation.toSuccessResponse()?.resolve().toSchema()

    const response = responseSchema === undefined ||
        responseSchema instanceof OasVoid
      ? null
      : this.insertNormalizedModel(EffectProjection, {
        schema: responseSchema,
        fallbackName: `${name}Response`,
      }).identifier

    // The barrel line for this endpoint and for the schemas that co-locate
    // with it. `insertNormalizedModel` names an inline schema by the
    // fallback and writes it into this file without running the peer's
    // constructor, so the peer's own barrel registration never sees it; a
    // `$ref` keeps its own name and path and is in the barrel already.
    const coLocated = [params, body, response]
      .filter(
        (identifier): identifier is IdentifierBase =>
          identifier !== null && identifier.name.startsWith(name),
      )

    // The engine hands back the export path as `@/` plus forward slashes,
    // so its folder ends at the last `/`.
    const folder = destinationPath.slice(0, destinationPath.lastIndexOf('/'))

    this.registerInto(
      `${folder}/index.generated.ts`,
      {
        reExports: {
          [destinationPath]: [settings.identifier, ...coLocated].map(
            toTsIdentifier,
          ),
        },
      },
    )

    this.register({
      imports: {
        effect: ['Effect'],
        'effect/unstable/http': ['HttpClient'],
      },
    })

    this.parameters = List.toParams([
      hasParams
        ? new TypedParameter({
          context,
          name: 'params',
          schemaName: params.name,
        })
        : undefined,
      body === null
        ? undefined
        : new TypedParameter({ context, name: 'body', schemaName: body.name }),
    ])

    this.request = new EffectRequest({
      context,
      operation,
      destinationPath,
      hasParams,
      bodyName: body === null ? null : body.name,
    })

    this.response = response === null
      ? new ResponseVoid({ context })
      : new ResponseRead({
        context,
        destinationPath,
        schemaName: response.name,
      })
  }

  override toString(): string {
    return `${this.parameters} =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    ${this.request}
    ${this.response}
  })`
  }
}
