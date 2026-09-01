import type { GenerateContextType } from '@skmtc/core'
import { KtAnnotation, KtFunctionSignature, KtSnippet } from '@skmtc/lang-kotlin'
import { HTTP_PACKAGE, WEB_BIND_ANNOTATION_PACKAGE, WEB_SERVER_PACKAGE } from './lib.ts'

/**
 * The `@RestControllerAdvice` that turns a `ResponseStatusException` —
 * what a service implementation throws — into an {@link ApiErrorValue}
 * body, so the error shape is documented and stable rather than whatever
 * Spring Boot's default error rendering emits.
 */
type ApiErrorHandlerValueArgs = {
  context: GenerateContextType
  destinationPath: string
}

export class ApiErrorHandlerValue extends KtSnippet {
  annotations: KtAnnotation[]
  description =
    'Maps ResponseStatusException thrown by service implementations to ApiError bodies.'
  handler: KtFunctionSignature

  constructor({ context, destinationPath }: ApiErrorHandlerValueArgs) {
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
