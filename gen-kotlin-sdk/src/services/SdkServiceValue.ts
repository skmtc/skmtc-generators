import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { renderServiceBody, toServiceImports, type ServiceFlavor } from '@/services/renderService.ts'
import {
  renderServiceImplBody,
  toServiceImplImports
} from '@/services/renderServiceImpl.ts'
import { toServiceName } from '@/services/renderService.ts'
import type { SdkService } from '@/services/SdkService.ts'

type SdkServiceValueArgs = {
  context: GenerateContextType
  service: SdkService
  flavor: ServiceFlavor
  basePackage: string
  destinationPath: string
  fileHeader: string
}

/** Service INTERFACE file value (§E-2). */
export class SdkServiceValue extends KtSnippet {
  service: SdkService
  flavor: ServiceFlavor

  constructor({ context, service, flavor, basePackage, destinationPath, fileHeader }: SdkServiceValueArgs) {
    super({ context })
    this.service = service
    this.flavor = flavor

    this.register({
      imports: toServiceImports(service, basePackage),
      fileHeader,
      destinationPath
    })
  }

  override toString(): string {
    return renderServiceBody(this.service, this.flavor)
  }
}

/** ServiceImpl file value (§E-3) — `internal constructor` + supertype. */
export class SdkServiceImplValue extends KtSnippet {
  service: SdkService
  flavor: ServiceFlavor

  constructor({ context, service, flavor, basePackage, destinationPath, fileHeader }: SdkServiceValueArgs) {
    super({ context })
    this.service = service
    this.flavor = flavor

    this.register({
      imports: toServiceImplImports(service, flavor, basePackage),
      fileHeader,
      destinationPath
    })
  }

  get constructorModifiers(): string {
    return 'internal'
  }

  get constructorParameters(): string {
    return '    private val clientOptions: ClientOptions'
  }

  get supertypes(): string[] {
    return [toServiceName(this.service, this.flavor)]
  }

  override toString(): string {
    return renderServiceImplBody(this.service, this.flavor)
  }
}
