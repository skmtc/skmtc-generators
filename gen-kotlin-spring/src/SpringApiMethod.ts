import { capitalize, camelCase } from '@skmtc/core'
import type { GenerateContextType, Method, OasOperation } from '@skmtc/core'
import {
  KtAnnotation,
  KtFunctionSignature,
  KtSnippet,
  sanitizePropertyName,
  type KtFunctionParameterArgs
} from '@skmtc/lang-kotlin'
import { toKtValue } from '@skmtc/gen-kotlin'
import denoJson from '../deno.json' with { type: 'json' }

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

type MappingAnnotation = {
  annotation: KtAnnotation
  imports: string[]
}

/**
 * The Spring mapping annotation for an HTTP method. The OAS path goes in
 * verbatim — `{id}` is already Spring's template syntax (v1 carries no
 * servers/base-path prefix).
 */
const toMappingAnnotation = (method: Method, path: string): MappingAnnotation => {
  switch (method) {
    case 'get':
      return { annotation: new KtAnnotation('GetMapping', [`"${path}"`]), imports: ['GetMapping'] }
    case 'post':
      return { annotation: new KtAnnotation('PostMapping', [`"${path}"`]), imports: ['PostMapping'] }
    case 'put':
      return { annotation: new KtAnnotation('PutMapping', [`"${path}"`]), imports: ['PutMapping'] }
    case 'patch':
      return {
        annotation: new KtAnnotation('PatchMapping', [`"${path}"`]),
        imports: ['PatchMapping']
      }
    case 'delete':
      return {
        annotation: new KtAnnotation('DeleteMapping', [`"${path}"`]),
        imports: ['DeleteMapping']
      }
    case 'head':
    case 'options':
    case 'trace':
      return {
        annotation: new KtAnnotation('RequestMapping', [
          `method = [RequestMethod.${method.toUpperCase()}]`,
          `path = ["${path}"]`
        ]),
        imports: ['RequestMapping', 'RequestMethod']
      }
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
    const fallbackBase = capitalize(methodName)

    const mapping = toMappingAnnotation(operation.method, operation.path)
    const annotationImports = new Set<string>(mapping.imports)

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

    for (const parameter of operation.toParams(['path'])) {
      annotationImports.add('PathVariable')

      addParameter(
        sanitizePropertyName(camelCase(parameter.name)),
        toKtValue({
          schema: parameter.toSchema(),
          destinationPath,
          required: true,
          context,
          fallbackName: `${fallbackBase}${capitalize(camelCase(parameter.name))}`
        }),
        new KtAnnotation('PathVariable', [`"${parameter.name}"`])
      )
    }

    for (const parameter of operation.toParams(['query'])) {
      annotationImports.add('RequestParam')

      addParameter(
        sanitizePropertyName(camelCase(parameter.name)),
        toKtValue({
          schema: parameter.toSchema(),
          destinationPath,
          required: parameter.required ?? false,
          context,
          fallbackName: `${fallbackBase}${capitalize(camelCase(parameter.name))}`
        }),
        new KtAnnotation('RequestParam', [`"${parameter.name}"`]),
        !(parameter.required ?? false)
      )
    }

    const body = operation.toRequestBody(({ schema, requestBody }) => ({
      schema,
      required: requestBody.required
    }))

    if (body) {
      annotationImports.add('RequestBody')

      addParameter(
        'body',
        toKtValue({
          schema: body.schema,
          destinationPath,
          required: body.required ?? false,
          context,
          fallbackName: `${fallbackBase}Body`
        }),
        new KtAnnotation('RequestBody'),
        !(body.required ?? false)
      )
    }

    const responseSchema = operation.toSuccessResponse()?.resolve().toSchema()

    const returnType = responseSchema
      ? toKtValue({
          schema: responseSchema,
          destinationPath,
          required: true,
          context,
          fallbackName: `${fallbackBase}Response`
        })
      : undefined

    const controllerAnnotations = [mapping.annotation]
    const statusName = toResponseStatusName(operation.toSuccessResponseCode())

    if (statusName) {
      annotationImports.add('ResponseStatus')
      controllerAnnotations.push(new KtAnnotation('ResponseStatus', [`HttpStatus.${statusName}`]))

      this.register({
        imports: { 'org.springframework.http': ['HttpStatus'] },
        destinationPath
      })
    }

    this.register({
      imports: {
        'org.springframework.web.bind.annotation': [...annotationImports].sort()
      },
      destinationPath
    })

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
