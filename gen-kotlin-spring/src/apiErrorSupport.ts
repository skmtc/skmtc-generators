import { join } from '@std/path'
import type { GenerateContextType } from '@skmtc/core'
import {
  KtAnnotation,
  KtFunctionSignature,
  KtParameterList,
  KtSnippet,
  createClass,
  createDataClass,
  defineAndRegister
} from '@skmtc/lang-kotlin'
import { WEB_BIND_ANNOTATION_PACKAGE } from './SpringApiMethod.ts'

/**
 * The generated error channel (spec 29, Milestone G): consumers throw
 * Spring's own `ResponseStatusException` from ServiceImpls
 * (`throw ResponseStatusException(HttpStatus.NOT_FOUND, "No such user")`)
 * and this generated `@RestControllerAdvice` renders it as a small
 * `ApiError` body. In the Jackson stack the DTO needs no serialization
 * annotation — Jackson binds a plain data class natively; the advice
 * exists to keep the error shape STABLE and documented rather than
 * whatever Spring Boot's default error rendering emits. Complete output,
 * no stubs; schema-declared error DTOs are the named follow-up (this
 * schema generation's fixtures declare none).
 */
export class ApiErrorValue extends KtSnippet {
  description = 'The wire shape every handled error renders to.'
  parameterList: KtParameterList

  constructor({ context }: { context: GenerateContextType }) {
    super({ context })

    this.parameterList = new KtParameterList([
      { name: 'status', type: 'Int' },
      { name: 'message', type: 'String', nullable: true, defaultValue: 'null' }
    ])
  }

  override toString(): string {
    return `${this.parameterList}`
  }
}

export class ApiErrorHandlerValue extends KtSnippet {
  annotations: KtAnnotation[]
  description =
    'Maps ResponseStatusException thrown by service implementations to ApiError bodies.'
  handler: KtFunctionSignature

  constructor({ context, destinationPath }: { context: GenerateContextType; destinationPath: string }) {
    super({ context })

    this.annotations = [
      new KtAnnotation({
        context,
        destinationPath,
        name: 'RestControllerAdvice',
        packageName: WEB_BIND_ANNOTATION_PACKAGE
      })
    ]

    this.handler = new KtFunctionSignature({
      name: 'handleResponseStatus',
      parameters: [{ name: 'exception', type: 'ResponseStatusException' }],
      returnType: 'ResponseEntity<ApiError>',
      annotations: [
        new KtAnnotation({
          context,
          destinationPath,
          name: 'ExceptionHandler',
          packageName: WEB_BIND_ANNOTATION_PACKAGE,
          args: ['ResponseStatusException::class']
        })
      ],
      body: 'ResponseEntity.status(exception.statusCode).body(ApiError(exception.statusCode.value(), exception.reason))'
    })

    // Argument/type symbols from OTHER packages than the annotations' own.
    this.register({
      imports: {
        'org.springframework.http': ['ResponseEntity'],
        'org.springframework.web.server': ['ResponseStatusException']
      },
      destinationPath
    })
  }

  override toString(): string {
    // The value owns the braced body (head+value model).
    return ` {\n${this.handler}\n}`
  }
}

/**
 * Emit `ApiError` + `ApiErrorHandler` once per run (the accumulator
 * `findDefinition` dedup) into `<basePackage>/ApiError.generated.kt`.
 */
export const ensureApiErrorSupport = (context: GenerateContextType, basePackage: string): void => {
  const exportPath = join('@', ...basePackage.split('.'), 'ApiError.generated.kt')

  if (context.findDefinition({ name: 'ApiError', exportPath })) {
    return
  }

  defineAndRegister(context, {
    identifier: createDataClass('ApiError'),
    value: new ApiErrorValue({ context }),
    destinationPath: exportPath
  })

  defineAndRegister(context, {
    identifier: createClass('ApiErrorHandler'),
    value: new ApiErrorHandlerValue({ context, destinationPath: exportPath }),
    destinationPath: exportPath
  })
}
