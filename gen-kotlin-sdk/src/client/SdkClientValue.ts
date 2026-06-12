import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import {
  clientKdocLines,
  renderClientBody,
  renderClientImplBody,
  toClientImplImports,
  toClientImports,
  type SdkClientModel
} from './SdkClient.ts'

type Flavor = 'blocking' | 'async'

type SdkClientValueArgs = {
  context: GenerateContextType
  model: SdkClientModel
  flavor: Flavor
  basePackage: string
  destinationPath: string
  fileHeader: string
}

/** Client INTERFACE file value (§E-5) — carries the big client KDoc. */
export class SdkClientValue extends KtSnippet {
  model: SdkClientModel
  flavor: Flavor

  constructor({ context, model, flavor, basePackage, destinationPath, fileHeader }: SdkClientValueArgs) {
    super({ context })
    this.model = model
    this.flavor = flavor

    this.register({
      imports: toClientImports(model, flavor, basePackage),
      fileHeader,
      destinationPath
    })
  }

  get description(): string {
    return clientKdocLines(this.model, this.flavor).join('\n')
  }

  override toString(): string {
    return renderClientBody(this.model, this.flavor)
  }
}

/** Client IMPL file value (§E-5) — public primary constructor + supertype. */
export class SdkClientImplValue extends KtSnippet {
  model: SdkClientModel
  flavor: Flavor

  constructor({ context, model, flavor, basePackage, destinationPath, fileHeader }: SdkClientValueArgs) {
    super({ context })
    this.model = model
    this.flavor = flavor

    this.register({
      imports: toClientImplImports(model, flavor, basePackage),
      fileHeader,
      destinationPath
    })
  }

  get constructorParameters(): string {
    return '    private val clientOptions: ClientOptions'
  }

  get supertypes(): string[] {
    return [
      this.flavor === 'async'
        ? `${this.model.prefix}ClientAsync`
        : `${this.model.prefix}Client`
    ]
  }

  override toString(): string {
    return renderClientImplBody(this.model, this.flavor)
  }
}
