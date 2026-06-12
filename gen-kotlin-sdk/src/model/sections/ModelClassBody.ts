import type { GenerateContextType, Stringable } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import type { RenderContext } from '@/RenderContext.ts'
import type { SdkEnum, SdkModel, SdkType } from '@/model/SdkModel.ts'
import { AdditionalPropertiesAccessors } from '@/model/sections/AdditionalPropertiesAccessors.ts'
import { EnvelopeConversion } from '@/model/sections/EnvelopeConversion.ts'
import { KnownValueEnum } from '@/model/sections/KnownValueEnum.ts'
import { ModelBuilder } from '@/model/sections/ModelBuilder.ts'
import { ModelCompanion } from '@/model/sections/ModelCompanion.ts'
import { ModelIdentity } from '@/model/sections/ModelIdentity.ts'
import { NestedModelClass } from '@/model/sections/NestedModelClass.ts'
import { RawAccessors } from '@/model/sections/RawAccessors.ts'
import { SecondaryConstructor } from '@/model/sections/SecondaryConstructor.ts'
import { TypedAccessors } from '@/model/sections/TypedAccessors.ts'
import { ValidateBlock } from '@/model/sections/ValidateBlock.ts'
import { ValidityScore } from '@/model/sections/ValidityScore.ts'

type Args = {
  context: GenerateContextType
  model: SdkModel
  renderContext: RenderContext
  destinationPath: string
}

/**
 * The §C3 section set in corpus order — composed once in the
 * constructor; `toString()` joins. Shared by the file-level model
 * value and every nested class (recursion via `NestedModelClass`).
 */
export class ModelClassBody extends KtSnippet {
  sections: Stringable[]

  constructor({ context, model, renderContext, destinationPath }: Args) {
    super({ context })

    const shared = { context, renderContext, destinationPath }

    this.sections = [
      new SecondaryConstructor({ ...shared, model }),
      ...(model.envelope ? [new EnvelopeConversion(shared)] : []),
      new TypedAccessors({ ...shared, fields: model.fields }),
      new RawAccessors({ ...shared, fields: model.fields }),
      new AdditionalPropertiesAccessors(shared),
      'fun toBuilder() = Builder().from(this)',
      new ModelCompanion({ context, model }),
      new ModelBuilder({ ...shared, model }),
      new ValidateBlock({ ...shared, model }),
      new ValidityScore({ context, model }),
      ...collectNestedTypes(model).map(nested =>
        nested.kind === 'model'
          ? new NestedModelClass({ ...shared, model: nested.model })
          : new KnownValueEnum({ ...shared, enumModel: nested.enumModel })
      ),
      new ModelIdentity({ context, model, destinationPath })
    ]
  }

  override toString(): string {
    return `\n${this.sections.join('\n\n')}`
  }
}

const collectNestedTypes = (
  model: SdkModel
): ({ kind: 'model'; model: SdkModel } | { kind: 'enum'; enumModel: SdkEnum })[] => {
  return model.fields.flatMap(field => nestedTypesOf(field.type))
}

const nestedTypesOf = (
  type: SdkType
): ({ kind: 'model'; model: SdkModel } | { kind: 'enum'; enumModel: SdkEnum })[] => {
  switch (type.kind) {
    case 'model':
      return [{ kind: 'model', model: type.model }]
    case 'enum':
      return [{ kind: 'enum', enumModel: type.enumModel }]
    case 'list':
      return nestedTypesOf(type.element)
    case 'scalar':
    case 'datetime':
    case 'shared':
      return []
    default: {
      const _exhaustive: never = type
      throw new Error(`Unhandled SdkType: ${JSON.stringify(_exhaustive)}`)
    }
  }
}
