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
 * One abstract interface method from one OAS operation — a
 * {@link KtFunctionSignature} wrapped with the Spring policy:
 *
 * - name: `${method}${PascalCase(path)}` (`get /users/{id}` →
 *   `getUsersId`; no `operationId` — deterministic per method+path).
 * - mapping annotation above the signature; parameter binding annotations
 *   inline, ALWAYS carrying the explicit wire name (renames are free).
 * - parameter order: path params, query params, then the JSON body.
 * - types via gen-kotlin's value layer — refs insert the DTO peer, the
 *   value owns the nullability `?` (single owner; `KtFunctionParameter`'s
 *   own `nullable` flag stays unset).
 * - return type = the lowest-2xx response's `application/json` schema;
 *   none → no `: T` (Kotlin's implicit `Unit`).
 */
export class SpringApiMethod extends KtSnippet {
  signature: KtFunctionSignature

  constructor({ context, operation, destinationPath }: SpringApiMethodArgs) {
    super({ context })

    const methodName = `${operation.method}${capitalize(camelCase(operation.path))}`
    const fallbackBase = capitalize(methodName)

    const mapping = toMappingAnnotation(operation.method, operation.path)
    const annotationImports = new Set<string>(mapping.imports)

    const parameters: KtFunctionParameterArgs[] = []

    for (const parameter of operation.toParams(['path'])) {
      annotationImports.add('PathVariable')

      parameters.push({
        name: sanitizePropertyName(camelCase(parameter.name)),
        type: toKtValue({
          schema: parameter.toSchema(),
          destinationPath,
          required: true,
          context,
          fallbackName: `${fallbackBase}${capitalize(camelCase(parameter.name))}`
        }),
        annotations: [new KtAnnotation('PathVariable', [`"${parameter.name}"`])]
      })
    }

    for (const parameter of operation.toParams(['query'])) {
      annotationImports.add('RequestParam')

      parameters.push({
        name: sanitizePropertyName(camelCase(parameter.name)),
        type: toKtValue({
          schema: parameter.toSchema(),
          destinationPath,
          required: parameter.required ?? false,
          context,
          fallbackName: `${fallbackBase}${capitalize(camelCase(parameter.name))}`
        }),
        annotations: [new KtAnnotation('RequestParam', [`"${parameter.name}"`])]
      })
    }

    const body = operation.toRequestBody(({ schema, requestBody }) => ({
      schema,
      required: requestBody.required
    }))

    if (body) {
      annotationImports.add('RequestBody')

      parameters.push({
        name: 'body',
        type: toKtValue({
          schema: body.schema,
          destinationPath,
          required: body.required ?? false,
          context,
          fallbackName: `${fallbackBase}Body`
        }),
        annotations: [new KtAnnotation('RequestBody')]
      })
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

    this.register({
      imports: {
        'org.springframework.web.bind.annotation': [...annotationImports].sort()
      },
      destinationPath
    })

    this.signature = new KtFunctionSignature({
      name: methodName,
      parameters,
      returnType,
      annotations: [mapping.annotation]
    })
  }

  override toString(): string {
    return `${this.signature}`
  }
}
