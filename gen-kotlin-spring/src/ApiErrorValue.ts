import type { GenerateContextType } from '@skmtc/core'
import { KtParameterList, KtSnippet } from '@skmtc/lang-kotlin'

/**
 * The generated error channel (spec 29, Milestone G): consumers throw
 * Spring's own `ResponseStatusException` from their service classes
 * (`throw ResponseStatusException(HttpStatus.NOT_FOUND, "No such user")`)
 * and this generated `@RestControllerAdvice` renders it as a small
 * `ApiError` body. In the Jackson stack the DTO needs no serialization
 * annotation — Jackson binds a plain data class natively; the advice
 * exists to keep the error shape STABLE and documented rather than
 * whatever Spring Boot's default error rendering emits. Complete output,
 * no stubs; schema-declared error DTOs are the named follow-up (this
 * schema generation's fixtures declare none).
 */
type ApiErrorValueArgs = {
  context: GenerateContextType
}

export class ApiErrorValue extends KtSnippet {
  description = 'The wire shape every handled error renders to.'
  parameterList: KtParameterList

  constructor({ context }: ApiErrorValueArgs) {
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
