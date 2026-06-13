import type { GenerateContextType, OasOperation } from '@skmtc/core'
import { KtAnnotation, KtSnippet } from '@skmtc/lang-kotlin'
import { sdkConfig as config } from '@/config.ts'
import type { SharedHashes } from '@/model/structuralHash.ts'
import { toBodyShape, toBodySnippet, type BodySnippet } from '@/params/body/BodySnippet.ts'
import { toParamFields } from '@/params/toParamFields.ts'
import { ParamsClassBody } from '@/params/sections/ParamsClassBody.ts'
import { ParamsConstructorParameters } from '@/params/sections/ParamsConstructorParameters.ts'

export type SdkParamsValueArgs = {
  context: GenerateContextType
  operation: OasOperation
  className: string
  /** Config deprecation message (the enrichment's `deprecatedMessage`). */
  deprecatedMessage: string | undefined
  sharedHashes: SharedHashes
  destinationPath: string
  fileHeader: string
}

/**
 * The file-level VALUE for a Params class (§D-3) — the producer IS the
 * model: the constructor walks the operation into param producers and
 * chooses the request-body shape ONCE (`toBodySnippet`); every section
 * reads the producers and the chosen body Snippet. Protocol members
 * (`KtConstructed`, `KtSupertyped`, `KtDocumented`, `KtAnnotated`) are
 * plain fields.
 */
export class SdkParamsValue extends KtSnippet {
  description: string
  annotations: KtAnnotation[]
  constructorModifiers = 'private'
  constructorParameters: ParamsConstructorParameters
  supertypes = ['Params']
  body: BodySnippet
  classBody: ParamsClassBody

  constructor({
    context,
    operation,
    className,
    deprecatedMessage,
    sharedHashes,
    destinationPath,
    fileHeader
  }: SdkParamsValueArgs) {
    super({ context })

    this.description =
      operation.description ?? operation.summary ?? toPathSlug(operation.path)

    const deprecated =
      deprecatedMessage ?? (operation.deprecated === true ? 'deprecated' : undefined)
    this.annotations = deprecated
      ? [new KtAnnotation('Deprecated', [JSON.stringify(deprecated)])]
      : []

    const params = toParamFields({ context, operation, destinationPath })
    this.body = toBodySnippet({
      context,
      shape: toBodyShape(operation),
      destinationPath,
      sharedHashes
    })

    // The construction and fence axes — decided once, read by the
    // companion and the Builder.
    const hasNone = !params.some(param => param.required) && !this.body.hasRequired
    const fenceNames = [
      ...params.filter(param => param.required).map(param => param.kotlinName),
      ...this.body.fenceFields
    ]

    this.constructorParameters = new ParamsConstructorParameters({
      context,
      params,
      body: this.body,
      destinationPath
    })

    this.classBody = new ParamsClassBody({
      context,
      className,
      params,
      body: this.body,
      hasNone,
      fenceNames,
      destinationPath
    })

    this.register({
      imports: { [`${config.basePackage}.core`]: ['Params'] },
      fileHeader,
      destinationPath
    })
  }

  override toString(): string {
    return `${this.classBody}`
  }
}

/** `/api/where/stops-for-location.json` → `stops-for-location`. */
const toPathSlug = (path: string): string => {
  const segments = path.split('/').filter(Boolean)
  const last = segments[segments.length - 1] ?? path

  return last.replace(/\.json$/, '').replace(/\{.*\}/, '').replace(/\/$/, '')
}
