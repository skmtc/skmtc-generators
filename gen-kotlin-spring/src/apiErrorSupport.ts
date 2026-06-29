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

/**
 * The generated error channel (spec 29, Milestone G): consumers throw
 * Spring's own `ResponseStatusException` from ServiceImpls
 * (`throw ResponseStatusException(HttpStatus.NOT_FOUND, "No such user")`)
 * and this generated `@RestControllerAdvice` renders it as a small
 * `@Serializable` body — necessary because the documented kotlinx setup
 * excludes Jackson, which Spring Boot's default error rendering needs.
 * Complete output, no stubs; schema-declared error DTOs are the named
 * follow-up (this schema generation's fixtures declare none).
 */
export class ApiErrorValue extends KtSnippet {
  annotations = [new KtAnnotation('Serializable')]
  description = 'The wire shape every handled error renders to.'

  constructor({ context, destinationPath }: { context: GenerateContextType; destinationPath: string }) {
    super({ context })

    this.register({
      imports: { 'kotlinx.serialization': ['Serializable'] },
      destinationPath
    })
  }

  override toString(): string {
    return `${new KtParameterList([
      { name: 'status', type: 'Int' },
      { name: 'message', type: 'String', nullable: true, defaultValue: 'null' }
    ])}`
  }
}

export class ApiErrorHandlerValue extends KtSnippet {
  annotations = [new KtAnnotation('RestControllerAdvice')]
  description =
    'Maps ResponseStatusException thrown by service implementations to ApiError bodies.'

  constructor({ context, destinationPath }: { context: GenerateContextType; destinationPath: string }) {
    super({ context })

    this.register({
      imports: {
        'org.springframework.http': ['ResponseEntity'],
        'org.springframework.web.bind.annotation': ['ExceptionHandler', 'RestControllerAdvice'],
        'org.springframework.web.server': ['ResponseStatusException']
      },
      destinationPath
    })
  }

  override toString(): string {
    return `${new KtFunctionSignature({
      name: 'handleResponseStatus',
      parameters: [{ name: 'exception', type: 'ResponseStatusException' }],
      returnType: 'ResponseEntity<ApiError>',
      annotations: [new KtAnnotation('ExceptionHandler', ['ResponseStatusException::class'])],
      body: 'ResponseEntity.status(exception.statusCode).body(ApiError(exception.statusCode.value(), exception.reason))'
    })}`
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
    value: new ApiErrorValue({ context, destinationPath: exportPath }),
    destinationPath: exportPath
  })

  defineAndRegister(context, {
    identifier: createClass('ApiErrorHandler'),
    value: new ApiErrorHandlerValue({ context, destinationPath: exportPath }),
    destinationPath: exportPath
  })
}
