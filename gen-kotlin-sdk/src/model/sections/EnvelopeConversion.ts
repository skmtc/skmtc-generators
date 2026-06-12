import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import invariant from 'tiny-invariant'
import { sdkConfig as config } from '@/config.ts'
import { indent } from '@/format.ts'

type Args = {
  context: GenerateContextType
  destinationPath: string
}

/** `toResponseWrapper()` — envelope-covering responses convert to the wrapper class. */
export class EnvelopeConversion extends KtSnippet {
  envelope: { className: string; fields: string[] }

  constructor({ context, destinationPath }: Args) {
    super({ context })

    invariant(
      config.sharedModels.envelope,
      '@skmtc/gen-kotlin-sdk: envelope section rendered without envelope config'
    )
    this.envelope = config.sharedModels.envelope

    this.register({
      imports: { [`${config.basePackage}.models`]: [this.envelope.className] },
      destinationPath
    })
  }

  override toString(): string {
    const chain = this.envelope.fields.map(field => `    .${field}(${field})`).join('\n')

    return `fun to${this.envelope.className}(): ${this.envelope.className} =
    ${this.envelope.className}.builder()
${indent(chain, 1)}
        .build()`
  }
}
