import { capitalize, camelCase } from '@skmtc/core'
import type { GenerateContextType, Method, OasOperation } from '@skmtc/core'
import {
  KtAnnotation,
  KtFunctionSignature,
  KtSnippet,
  register,
  sanitizePropertyName,
  type KtFunctionParameterArgs
} from '@skmtc/lang-kotlin'
import { toKotlinValue } from '@skmtc/gen-kotlin-jackson'
import denoJson from '../deno.json' with { type: 'json' }

/** Home of Spring's request-mapping and binding annotations. */
export const WEB_BIND_ANNOTATION_PACKAGE = 'org.springframework.web.bind.annotation'

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
 * in verbatim — `{id}` is already Spring's template syntax (v1 carries no
 * servers/base-path prefix).
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

  constructor({ context, operation, destinationPath }: SpringApiMethodArgs) {
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

    const serviceParameters: KtFunctionParameterArgs[] = []
    const controllerParameters: KtFunctionParameterArgs[] = []

    const addParameter = (
      name: string,
      type: KtFunctionParameterArgs['type'],
      annotation: KtAnnotation,
      optional = false
    ) => {
      // Optional params default to null on the SEAM only (named-args
      // ergonomics for human callers/tests); the controller signature
      // stays an exact binding and always passes every argument.
      serviceParameters.push({ name, type, defaultValue: optional ? 'null' : undefined })
      controllerParameters.push({ name, type, annotations: [annotation] })
    }

    // Type snippets come from the model peer's exported router — an
    // inline shape synthesizes its own stackTrail-named sibling, so no
    // naming hint is threaded (the retired kotlinx `fallbackName` API).
    for (const parameter of operation.toParams(['path'])) {
      addParameter(
        sanitizePropertyName(camelCase(parameter.name)),
        toKotlinValue({
          schema: parameter.toSchema(),
          destinationPath,
          required: true,
          context
        }),
        new KtAnnotation({
          context,
          destinationPath,
          name: 'PathVariable',
          packageName: WEB_BIND_ANNOTATION_PACKAGE,
          args: [`"${parameter.name}"`]
        })
      )
    }

    for (const parameter of operation.toParams(['query'])) {
      addParameter(
        sanitizePropertyName(camelCase(parameter.name)),
        toKotlinValue({
          schema: parameter.toSchema(),
          destinationPath,
          required: parameter.required ?? false,
          context
        }),
        new KtAnnotation({
          context,
          destinationPath,
          name: 'RequestParam',
          packageName: WEB_BIND_ANNOTATION_PACKAGE,
          args: [`"${parameter.name}"`]
        }),
        !(parameter.required ?? false)
      )
    }

    const body = operation.toRequestBody(({ schema, requestBody }) => ({
      schema,
      required: requestBody.required
    }))

    if (body) {
      addParameter(
        'body',
        toKotlinValue({
          schema: body.schema,
          destinationPath,
          required: body.required ?? false,
          context
        }),
        new KtAnnotation({
          context,
          destinationPath,
          name: 'RequestBody',
          packageName: WEB_BIND_ANNOTATION_PACKAGE
        }),
        !(body.required ?? false)
      )
    }

    const responseSchema = operation.toSuccessResponse()?.resolve().toSchema()

    const returnType = responseSchema
      ? toKotlinValue({
          schema: responseSchema,
          destinationPath,
          required: true,
          context
        })
      : undefined

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
      this.register({
        imports: { 'org.springframework.http': ['HttpStatus'] },
        destinationPath
      })
    }

    const parameterNames = serviceParameters.map(parameter => parameter.name)

    const summary = operation.summary ?? operation.description
    const description = summary?.replaceAll('*/', '* /')

    this.serviceSignature = new KtFunctionSignature({
      name: methodName,
      parameters: serviceParameters,
      returnType,
      description
    })

    this.controllerSignature = new KtFunctionSignature({
      name: methodName,
      parameters: controllerParameters,
      returnType,
      annotations: controllerAnnotations,
      body: `service.${methodName}(${parameterNames.join(', ')})`
    })
  }

  override toString(): string {
    return `${this.controllerSignature}`
  }
}
