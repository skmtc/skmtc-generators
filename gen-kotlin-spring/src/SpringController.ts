import { OasVoid, camelCase } from '@skmtc/core'
import type {
  GenerateContextType,
  GeneratorKey,
  OasOperation,
  OasParameter,
  Stringable
} from '@skmtc/core'
import {
  KtAnnotation,
  KtFunctionSignature,
  KtSnippet,
  sanitizePropertyName
} from '@skmtc/lang-kotlin'
import type { KtFunctionParameterArgs } from '@skmtc/lang-kotlin'
import { toKotlinValue } from '@skmtc/gen-kotlin-jackson'
import { ModelReference } from './ModelReference.ts'
import {
  PATH_VARIABLE,
  REQUEST_BODY,
  REQUEST_PARAM,
  REST_CONTROLLER,
  SPRING_ANNOTATION_PACKAGE
} from './lib.ts'
import { isSupportedMethod, toMappingAnnotationName } from './methods.ts'
import { toBodyModelName, toHandlerName, toResponseModelName } from './naming.ts'

type SpringControllerArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey
  destinationPath: string
  operation: OasOperation
}

/**
 * The controller's VALUE — everything after the `class Name` head: the
 * braced body holding one handler.
 *
 * Class-level annotations ride the `KtAnnotated` protocol on this value
 * (the neutral definition signature has no slot for them); the projection
 * mirrors the array by reference so `@RestController` survives the
 * Driver wrapping the projection as the definition's value.
 */
export class SpringController extends KtSnippet {
  annotations: KtAnnotation[]
  handler: KtFunctionSignature

  constructor({ context, generatorKey, destinationPath, operation }: SpringControllerArgs) {
    super({ context, generatorKey })

    this.annotations = [
      new KtAnnotation({
        context,
        destinationPath,
        name: REST_CONTROLLER,
        packageName: SPRING_ANNOTATION_PACKAGE
      })
    ]

    const parameters: KtFunctionParameterArgs[] = [
      ...operation.toParams(['path']).map(parameter =>
        toBoundParameter({ context, destinationPath, parameter, annotationName: PATH_VARIABLE })
      ),
      ...operation.toParams(['query']).map(parameter =>
        toBoundParameter({ context, destinationPath, parameter, annotationName: REQUEST_PARAM })
      )
    ]

    // SLOT(request-body): a body is a MODEL — `$ref` or inline, the
    // reference class decides which insert path places it.
    const bodySchema = operation.toRequestBody(({ schema }) => schema)

    if (bodySchema) {
      parameters.push({
        name: 'body',
        type: new ModelReference({
          context,
          generatorKey,
          destinationPath,
          schema: bodySchema,
          fallbackName: toBodyModelName(operation)
        }),
        annotations: [
          new KtAnnotation({
            context,
            destinationPath,
            name: REQUEST_BODY,
            packageName: SPRING_ANNOTATION_PACKAGE
          })
        ]
      })
    }

    this.handler = new KtFunctionSignature({
      name: toHandlerName(operation),
      parameters,
      returnType: toReturnType({ context, generatorKey, destinationPath, operation }),
      annotations: [toMappingAnnotation({ context, destinationPath, operation })],
      body: new HandlerStub({ context, generatorKey })
    })
  }

  override toString(): string {
    return ` {\n${this.handler}\n}`
  }
}

type ToBoundParameterArgs = {
  context: GenerateContextType
  destinationPath: string
  parameter: OasParameter
  annotationName: string
}

/**
 * One path or query parameter, bound to its wire name.
 *
 * The Kotlin name is chosen first (`page_size` → `pageSize`), then the
 * binding annotation is decided by comparing the two — sanitization and
 * renaming are different jobs that compose. A backticked hard keyword
 * still EQUALS its wire key, so the unescaped form is what's compared.
 *
 * The TYPE comes from the model generator's type-expression router, so a
 * parameter schema is never re-derived here — and that router is the
 * single owner of Kotlin's `?`, which is why `nullable` stays unset.
 * Spring's Kotlin support reads a nullable parameter type as
 * `required = false`, so an optional query parameter needs no extra
 * annotation argument.
 */
const toBoundParameter = (
  { context, destinationPath, parameter, annotationName }: ToBoundParameterArgs
): KtFunctionParameterArgs => {
  const name = sanitizePropertyName(camelCase(parameter.name))

  const args = name.replaceAll('`', '') === parameter.name ? [] : [`"${parameter.name}"`]

  return {
    name,
    type: toKotlinValue({
      context,
      destinationPath,
      schema: parameter.toSchema(),
      required: parameter.required
    }),
    annotations: [
      new KtAnnotation({
        context,
        destinationPath,
        name: annotationName,
        packageName: SPRING_ANNOTATION_PACKAGE,
        args
      })
    ]
  }
}

type ToMappingAnnotationArgs = {
  context: GenerateContextType
  destinationPath: string
  operation: OasOperation
}

type ToReturnTypeArgs = ToMappingAnnotationArgs & {
  generatorKey: GeneratorKey
}

/**
 * SLOT(response): the 2xx response body is the handler's return type — a
 * MODEL, by the same two-branch rule as the request body. A response
 * with no content (the fixture's `204`) has no schema to name, so it
 * falls back to the peer's void snippet (`Unit`) rather than minting an
 * empty model.
 */
const toReturnType = (
  { context, generatorKey, destinationPath, operation }: ToReturnTypeArgs
): Stringable => {
  const schema = operation.toSuccessResponse()?.resolve().toSchema()

  if (!schema) {
    return toKotlinValue({
      context,
      destinationPath,
      schema: OasVoid.empty(),
      required: true
    })
  }

  return new ModelReference({
    context,
    generatorKey,
    destinationPath,
    schema,
    fallbackName: toResponseModelName(operation)
  })
}

/**
 * The mapping annotation — `@GetMapping("/orders/{orderId}")`. OpenAPI
 * path-template syntax IS Spring path syntax, so `operation.path` is used
 * as-is; the annotation's args are pre-quoted by the caller, as the
 * Kotlin layer's grammar requires.
 */
const toMappingAnnotation = (
  { context, destinationPath, operation }: ToMappingAnnotationArgs
): KtAnnotation => {
  const { method } = operation

  if (!isSupportedMethod(method)) {
    throw new Error(`Method '${method}' has no Spring mapping annotation`)
  }

  return new KtAnnotation({
    context,
    destinationPath,
    name: toMappingAnnotationName(method),
    packageName: SPRING_ANNOTATION_PACKAGE,
    args: [`"${operation.path}"`]
  })
}

type HandlerStubArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey
}

/**
 * The handler's expression body.
 *
 * `TODO(…)` is Kotlin's standard-library `Nothing`-returning stub, not a
 * left-behind marker: it type-checks against any declared return type and
 * throws `NotImplementedError` if called. Controllers are scaffolding —
 * the intended consumer workflow is to delegate to a hand-written
 * service, so the stub is the complete, correct output for this
 * generator rather than an unfinished piece of one.
 */
class HandlerStub extends KtSnippet {
  constructor({ context, generatorKey }: HandlerStubArgs) {
    super({ context, generatorKey })
  }

  override toString(): string {
    // Signed off: `TODO()` is Kotlin's stdlib stub function, and the stub
    // body is this generator's contract — there is no completed form to
    // emit instead (see this class's doc comment).
    // deno-lint-ignore skmtc/no-emitted-todos
    return `TODO("Implement")`
  }
}
