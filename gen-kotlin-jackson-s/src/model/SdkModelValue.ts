import type { GenerateContextType, OasObject } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { getModelConfig } from '@/modelConfig.ts'
import type { AddField, ModelField } from '@/model/ModelField.ts'
import type { SharedHashes } from '@/model/structuralHash.ts'
import { shadowFields, toModelFields } from '@/model/toModelFields.ts'
import { ModelClassBody } from '@/model/sections/ModelClassBody.ts'
import { PrimaryConstructorParameters } from '@/model/sections/PrimaryConstructorParameters.ts'

export type SdkModelValueArgs = {
  context: GenerateContextType
  schema: OasObject
  className: string
  destinationPath: string
  fileHeader: string
  sharedHashes: SharedHashes
  /** Component-shaped classes sort; top-level responses keep allOf-merge order. */
  sorted?: boolean
  /** Restrict to these wire names (the envelope model). */
  includeOnly?: string[]
  /** Enrichment field injections for the `data`-level nested class. */
  addFieldsForData?: AddField[]
  /**
   * Operation response models covering the envelope fields get the
   * `toResponseWrapper()` section; the shared/envelope models
   * themselves must not (the envelope cannot convert to itself).
   */
  detectEnvelope?: boolean
}

/**
 * The file-level VALUE for a model class — the producer IS the model:
 * the constructor walks the schema into field producers (which walk
 * their own types), runs the stdlib-shadowing pass once from the file
 * root, and composes the §C3 section set. Carries the `KtConstructed`
 * protocol for `KtDefinition`'s `class` shell.
 */
export class SdkModelValue extends KtSnippet {
  constructorModifiers = '@JsonCreator(mode = JsonCreator.Mode.DISABLED) private'
  constructorParameters: PrimaryConstructorParameters
  fields: ModelField[]
  body: ModelClassBody

  constructor({
    context,
    schema,
    className,
    destinationPath,
    fileHeader,
    sharedHashes,
    sorted,
    includeOnly,
    addFieldsForData,
    detectEnvelope
  }: SdkModelValueArgs) {
    super({ context })

    this.fields = toModelFields({
      context,
      schema,
      destinationPath,
      sharedHashes,
      sorted,
      includeOnly,
      addFieldsForData
    })

    shadowFields(this.fields, new Set())

    const config = getModelConfig()
    const envelopeFields = config.sharedModels.envelope?.fields ?? []
    const wireNames = new Set(this.fields.map(field => field.wireName))
    const envelope =
      detectEnvelope === true &&
      envelopeFields.length > 0 &&
      envelopeFields.every(name => wireNames.has(name))

    this.constructorParameters = new PrimaryConstructorParameters({
      context,
      fields: this.fields,
      destinationPath
    })
    this.body = new ModelClassBody({
      context,
      className,
      fields: this.fields,
      envelope,
      destinationPath
    })

    this.register({ fileHeader, destinationPath })
  }

  override toString(): string {
    return `${this.body}`
  }
}
