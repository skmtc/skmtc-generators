import type { GenerateContextType, Stringable } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import type { ModelField } from '@/model/ModelField.ts'
import { AdditionalPropertiesAccessors } from '@/model/sections/AdditionalPropertiesAccessors.ts'
import { EnvelopeConversion } from '@/model/sections/EnvelopeConversion.ts'
import { ModelBuilder } from '@/model/sections/ModelBuilder.ts'
import { ModelCompanion } from '@/model/sections/ModelCompanion.ts'
import { ModelIdentity } from '@/model/sections/ModelIdentity.ts'
import { RawAccessors } from '@/model/sections/RawAccessors.ts'
import { SecondaryConstructor } from '@/model/sections/SecondaryConstructor.ts'
import { TypedAccessors } from '@/model/sections/TypedAccessors.ts'
import { ValidateBlock } from '@/model/sections/ValidateBlock.ts'
import { ValidityScore } from '@/model/sections/ValidityScore.ts'

type Args = {
  context: GenerateContextType
  className: string
  fields: ModelField[]
  /** Envelope-covering responses get the `toResponseWrapper()` section. */
  envelope: boolean
  destinationPath: string
}

/**
 * The §C3 section set in corpus order — composed once in the
 * constructor; `toString()` joins. Shared by the file-level model
 * value and every nested class. Nested class/enum sections come off
 * the fields' types.
 */
export class ModelClassBody extends KtSnippet {
  sections: Stringable[]

  constructor({ context, className, fields, envelope, destinationPath }: Args) {
    super({ context })

    this.sections = [
      new SecondaryConstructor({ context, fields, destinationPath }),
      ...(envelope ? [new EnvelopeConversion({ context, destinationPath })] : []),
      new TypedAccessors({ context, fields }),
      new RawAccessors({ context, fields, destinationPath }),
      new AdditionalPropertiesAccessors({ context, destinationPath }),
      'fun toBuilder() = Builder().from(this)',
      new ModelCompanion({ context, className, fields }),
      new ModelBuilder({ context, className, fields, destinationPath }),
      new ValidateBlock({ context, className, fields, destinationPath }),
      new ValidityScore({ context, fields }),
      ...fields.flatMap(field => field.type.nestedSections),
      new ModelIdentity({ context, className, fields, destinationPath })
    ]
  }

  override toString(): string {
    return `\n${this.sections.join('\n\n')}`
  }
}
