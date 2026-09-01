import { capitalize, camelCase, decapitalize } from '@skmtc/core'
import type { GenerateContextType, Method, OasOperation, Stringable } from '@skmtc/core'
import {
  KtAnnotation,
  KtFunctionSignature,
  KtSnippet,
  register,
  sanitizePropertyName
} from '@skmtc/lang-kotlin'
import { toKotlinValue } from '@skmtc/gen-kotlin-jackson'
import denoJson from '../deno.json' with { type: 'json' }
import { HTTP_PACKAGE, WEB_BIND_ANNOTATION_PACKAGE, WEB_SERVER_PACKAGE } from './lib.ts'

/**
 * A wire parameter name as a Kotlin one: `Api-Version` → `apiVersion`.
 *
 * `camelCase` joins the segments but leaves the first one's case alone, which
 * only shows on names that start capitalised — headers, mostly, since paths
 * and query strings are lowercase by convention.
 */
const toParameterName = (name: string): string => {
  return sanitizePropertyName(decapitalize(camelCase(name)))
}

/**
 * Header parameters the OpenAPI Parameter Object says SHALL be ignored:
 * `Accept` and `Content-Type` are governed by the operation's content, and
 * `Authorization` by `securitySchemes`. Documents declare them anyway — a
 * header named there is still not bound.
 *
 * Compared case-insensitively, since HTTP header names are.
 */
const IGNORED_HEADERS = new Set(['accept', 'content-type', 'authorization'])

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * The consumer-supplied method rename (spec 28):
 * `enrichments["@skmtc/gen-kotlin-spring"][path][method].main.serviceMethodName`
 * — `getCreditNote` instead of the derived `getCreditNotesId`. Applies
 * to BOTH the service signature and the controller (declaration and
 * delegation call stay in lockstep by construction).
 */
const toServiceMethodName = (
  context: GenerateContextType,
  operation: OasOperation
): string | undefined => {
  const namespace = context.settings?.enrichments?.[denoJson.name]

  if (!isRecord(namespace)) {
    return undefined
  }

  const perPath = namespace[operation.path]
  const perMethod = isRecord(perPath) ? perPath[operation.method] : undefined
  const main = isRecord(perMethod) ? perMethod.main : undefined

  if (!isRecord(main)) {
    return undefined
  }

  return typeof main.serviceMethodName === 'string' ? main.serviceMethodName : undefined
}

type SpringApiMethodArgs = {
  context: GenerateContextType
  operation: OasOperation
  destinationPath: string
  /**
   * The `Default<Tag>Service` file, when the consumer asked for scaffolds.
   * A SECOND destination needs a SECOND walk of the same schemas (§
   * {@link toOperationParameters}), so it is threaded rather than
   * derived here.
   */
  implementationPath?: string
}

/** One operation input, resolved against ONE destination file. */
type OperationParameter = {
  name: string
  type: Stringable
  optional: boolean
  /** The binding annotation — absent when the caller asked for none. */
  binding: KtAnnotation | undefined
}

type ToOperationParametersArgs = {
  context: GenerateContextType
  operation: OasOperation
  destinationPath: string
  withBindings: boolean
}

/**
 * Path params, then query params, then header params, then the request body —
 * the order the generated signatures carry.
 *
 * Called ONCE PER DESTINATION FILE. A type snippet registers its imports
 * against the path it was built for, so the implementation file cannot
 * reuse the API file's snippets: it would render type names whose
 * imports live in the other file. The second walk is cheap — the model
 * peer's cache returns the same definitions — and it is what stitches
 * the DTO imports into the implementation.
 *
 * `withBindings: false` skips the `@PathVariable`/`@RequestParam`/
 * `@RequestBody` annotations, which would otherwise register Spring web
 * imports into a file that has no use for them.
 */
const toOperationParameters = (
  { context, operation, destinationPath, withBindings }: ToOperationParametersArgs
): OperationParameter[] => {
  const toBinding = (name: string, args?: string[]): KtAnnotation | undefined => {
    return withBindings
      ? new KtAnnotation({
          context,
          destinationPath,
          name,
          packageName: WEB_BIND_ANNOTATION_PACKAGE,
          args
        })
      : undefined
  }

  const parameters: OperationParameter[] = []

  for (const parameter of operation.toParams(['path'])) {
    parameters.push({
      name: toParameterName(parameter.name),
      type: toKotlinValue({
        schema: parameter.toSchema(),
        destinationPath,
        required: true,
        context
      }),
      optional: false,
      binding: toBinding('PathVariable', [`"${parameter.name}"`])
    })
  }

  for (const parameter of operation.toParams(['query'])) {
    const required = parameter.required ?? false

    parameters.push({
      name: toParameterName(parameter.name),
      type: toKotlinValue({
        schema: parameter.toSchema(),
        destinationPath,
        required,
        context
      }),
      optional: !required,
      binding: toBinding('RequestParam', [`"${parameter.name}"`])
    })
  }

  for (const parameter of operation.toParams(['header'])) {
    if (IGNORED_HEADERS.has(parameter.name.toLowerCase())) {
      continue
    }

    const required = parameter.required ?? false

    parameters.push({
      name: toParameterName(parameter.name),
      type: toKotlinValue({
        schema: parameter.toSchema(),
        destinationPath,
        required,
        context
      }),
      optional: !required,
      binding: toBinding('RequestHeader', [`"${parameter.name}"`])
    })
  }

  const body = operation.toRequestBody(({ schema, requestBody }) => ({
    schema,
    required: requestBody.required
  }))

  if (body) {
    const required = body.required ?? false

    parameters.push({
      name: 'body',
      type: toKotlinValue({
        schema: body.schema,
        destinationPath,
        required,
        context
      }),
      optional: !required,
      binding: toBinding('RequestBody')
    })
  }

  return parameters
}

type ToReturnTypeArgs = {
  context: GenerateContextType
  operation: OasOperation
  destinationPath: string
}

/** The lowest-2xx JSON body, or nothing (Kotlin's implicit `Unit`). */
const toReturnType = (
  { context, operation, destinationPath }: ToReturnTypeArgs
): Stringable | undefined => {
  const responseSchema = operation.toSuccessResponse()?.resolve().toSchema()

  return responseSchema
    ? toKotlinValue({ schema: responseSchema, destinationPath, required: true, context })
    : undefined
}

type ToMappingAnnotationArgs = {
  context: GenerateContextType
  destinationPath: string
  method: Method
  path: string
}

/**
 * The Spring mapping annotation for an HTTP method — a self-registering
 * `KtAnnotation` (its own import rides `packageName`). The OAS path goes
 * in verbatim — `{id}` is already Spring's template syntax, and any
 * `routePrefix` rides the class-level `@RequestMapping` instead.
 */
const toMappingAnnotation = (
  { context, destinationPath, method, path }: ToMappingAnnotationArgs
): KtAnnotation => {
  const toAnnotation = (name: string, args: string[]): KtAnnotation => {
    return new KtAnnotation({
      context,
      destinationPath,
      name,
      packageName: WEB_BIND_ANNOTATION_PACKAGE,
      args
    })
  }

  switch (method) {
    case 'get':
      return toAnnotation('GetMapping', [`"${path}"`])
    case 'post':
      return toAnnotation('PostMapping', [`"${path}"`])
    case 'put':
      return toAnnotation('PutMapping', [`"${path}"`])
    case 'patch':
      return toAnnotation('PatchMapping', [`"${path}"`])
    case 'delete':
      return toAnnotation('DeleteMapping', [`"${path}"`])
    case 'head':
    case 'options':
    case 'trace':
      // `RequestMethod` appears as an ARGUMENT symbol, not the
      // annotation's own name, so its import is registered here rather
      // than by the annotation leaf.
      register(context, {
        imports: { [WEB_BIND_ANNOTATION_PACKAGE]: ['RequestMethod'] },
        destinationPath
      })

      return toAnnotation('RequestMapping', [
        `method = [RequestMethod.${method.toUpperCase()}]`,
        `path = ["${path}"]`
      ])
    default: {
      const _exhaustive: never = method
      throw new Error(`Unhandled method: ${JSON.stringify(_exhaustive)}`)
    }
  }
}

/**
 * The non-default success statuses a generated controller declares via
 * `@ResponseStatus` (decision 6): 200 is Spring's default and renders
 * nothing; anything outside the named map is omitted.
 */
const toResponseStatusName = (code: string | undefined): string | undefined => {
  switch (code) {
    case '201':
      return 'CREATED'
    case '202':
      return 'ACCEPTED'
    case '204':
      return 'NO_CONTENT'
    default:
      return undefined
  }
}

/**
 * One operation → the signature PAIR: the abstract service-seam method
 * and the annotated, delegating controller method. Both are built from
 * ONE pass over the operation against ONE destination file, so every
 * type snippet (and any inline-shape sibling it synthesizes) is created
 * once and shared — the note-25 amendment's invariant.
 */
export class SpringApiMethod extends KtSnippet {
  serviceSignature: KtFunctionSignature
  controllerSignature: KtFunctionSignature
  /** Present only when the consumer asked for implementation scaffolds. */
  implementationSignature: KtFunctionSignature | undefined

  constructor({ context, operation, destinationPath, implementationPath }: SpringApiMethodArgs) {
    super({ context })

    const methodName =
      toServiceMethodName(context, operation) ??
      `${operation.method}${capitalize(camelCase(operation.path))}`

    const mappingAnnotation = toMappingAnnotation({
      context,
      destinationPath,
      method: operation.method,
      path: operation.path
    })

    // Type snippets come from the model peer's exported router — an
    // inline shape synthesizes its own stackTrail-named sibling, so no
    // naming hint is threaded (the retired kotlinx `fallbackName` API).
    //
    // Deliberately NOT `insertNormalizedModel` (the usual door for an
    // operation generator needing a peer model): for a head+value
    // language its generic glue joins the identifier head to the
    // value's TYPE-position render, which for an inline object emits
    // `data class NameMap<String, Any?>`-shaped invalid Kotlin and
    // reports success. The exported router IS jackson's sanctioned
    // door for inline schemas; refs still resolve to their models
    // through it.
    const parameters = toOperationParameters({
      context,
      operation,
      destinationPath,
      withBindings: true
    })

    const returnType = toReturnType({ context, operation, destinationPath })

    const controllerAnnotations = [mappingAnnotation]
    const statusName = toResponseStatusName(operation.toSuccessResponseCode())

    if (statusName) {
      controllerAnnotations.push(
        new KtAnnotation({
          context,
          destinationPath,
          name: 'ResponseStatus',
          packageName: WEB_BIND_ANNOTATION_PACKAGE,
          args: [`HttpStatus.${statusName}`]
        })
      )

      // `HttpStatus` is an argument symbol from a DIFFERENT package than
      // the annotation's own — registered separately.
      this.register({ imports: { [HTTP_PACKAGE]: ['HttpStatus'] }, destinationPath })
    }

    const parameterNames = parameters.map(parameter => parameter.name)

    const summary = operation.summary ?? operation.description
    const description = summary?.replaceAll('*/', '* /')

    this.serviceSignature = new KtFunctionSignature({
      name: methodName,
      // Optional params default to null on the SERVICE declaration only
      // (named-args ergonomics for human callers/tests); the controller
      // signature stays an exact binding and always passes every argument.
      parameters: parameters.map(({ name, type, optional }) => ({
        name,
        type,
        defaultValue: optional ? 'null' : undefined
      })),
      returnType,
      description
    })

    this.controllerSignature = new KtFunctionSignature({
      name: methodName,
      parameters: parameters.map(({ name, type, binding }) => ({
        name,
        type,
        annotations: binding ? [binding] : undefined
      })),
      returnType,
      annotations: controllerAnnotations,
      body: `service.${methodName}(${parameterNames.join(', ')})`
    })

    if (implementationPath !== undefined) {
      this.implementationSignature = new KtFunctionSignature({
        name: methodName,
        modifiers: ['override'],
        // An override may NOT repeat the interface's default values, so
        // the scaffold takes the parameters bare.
        parameters: toOperationParameters({
          context,
          operation,
          destinationPath: implementationPath,
          withBindings: false
        }).map(({ name, type }) => ({ name, type })),
        returnType: toReturnType({ context, operation, destinationPath: implementationPath }),
        body:
          'throw ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, ' +
          `"${methodName} is not implemented")`
      })

      this.register({
        imports: {
          [HTTP_PACKAGE]: ['HttpStatus'],
          [WEB_SERVER_PACKAGE]: ['ResponseStatusException']
        },
        destinationPath: implementationPath
      })
    }
  }

  override toString(): string {
    return `${this.controllerSignature}`
  }
}
