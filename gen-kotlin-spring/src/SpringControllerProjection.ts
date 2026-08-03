import { toGeneratorOnlyKey } from '@skmtc/core'
import type { OasOperationProjectionConstructorArgs } from '@skmtc/core'
import type { KtAnnotation } from '@skmtc/lang-kotlin'
import { SpringServerBase } from './base.ts'
import { SpringController } from './SpringController.ts'
import type { EnrichmentSchema } from './enrichments.ts'

/**
 * One controller class per supported operation.
 *
 * The tree is built entirely in the constructor — registration happens
 * here, `toString()` only reads precomputed fields. `annotations` is a
 * REFERENCE to the value's array, not a copy: the Driver wraps this
 * projection as the definition's value, so `@RestController` is read off
 * the projection, and one array under two names is what keeps the two
 * views from drifting.
 */
export class SpringControllerProjection extends SpringServerBase {
  value: SpringController
  annotations: KtAnnotation[]

  constructor({ context, operation, settings }: OasOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super({ context, operation, settings })

    this.value = new SpringController({
      context,
      generatorKey: toGeneratorOnlyKey({ generatorId: SpringServerBase.id }),
      destinationPath: settings.exportPath,
      operation
    })

    this.annotations = this.value.annotations
  }

  override toString(): string {
    return `${this.value}`
  }
}
