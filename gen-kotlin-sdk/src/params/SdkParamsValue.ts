import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import type { RenderContext } from '../model/renderModel.ts'
import {
  renderParamsBody,
  renderParamsConstructorParameters
} from './renderParams.ts'
import type { SdkParams } from './SdkParams.ts'

export type SdkParamsValueArgs = {
  context: GenerateContextType
  model: SdkParams
  renderContext: RenderContext
  basePackage: string
  destinationPath: string
  fileHeader: string
}

/**
 * The file-level VALUE for a Params class (§D-3). Carries the
 * `KtConstructed` (private constructor) and `KtSupertyped`
 * (` : Params`) protocols for the `class` shell; registers the
 * section-derived imports.
 */
export class SdkParamsValue extends KtSnippet {
  model: SdkParams
  renderContext: RenderContext

  constructor({
    context,
    model,
    renderContext,
    basePackage,
    destinationPath,
    fileHeader
  }: SdkParamsValueArgs) {
    super({ context })
    this.model = model
    this.renderContext = renderContext

    this.register({
      imports: toParamsImports({ model, basePackage, exceptionPrefix: renderContext.exceptionPrefix }),
      fileHeader,
      destinationPath
    })
  }

  // KtDocumented: the class KDoc (operation summary / path slug).
  get description(): string {
    return this.model.description
  }

  get constructorModifiers(): string {
    return 'private'
  }

  get constructorParameters(): string {
    return renderParamsConstructorParameters(this.model)
  }

  get supertypes(): string[] {
    return ['Params']
  }

  override toString(): string {
    return renderParamsBody(this.model, this.renderContext)
  }
}

type ToParamsImportsArgs = {
  model: SdkParams
  basePackage: string
  exceptionPrefix: string
}

const toParamsImports = ({
  model,
  basePackage,
  exceptionPrefix
}: ToParamsImportsArgs): Record<string, string[]> => {
  const hasRequired = model.params.some(param => param.required)
  const datetimes = model.params.flatMap(param =>
    param.type.kind === 'datetime' ? [param.type.date] : []
  )
  const hasEnum = model.params.some(param => param.type.kind === 'enum')

  const coreNames = ['Params']

  if (hasRequired) {
    coreNames.push('checkRequired')
  }

  if (hasEnum) {
    coreNames.push('Enum', 'JsonField')
  }

  const imports: Record<string, string[]> = {
    'java.util': ['Objects'],
    [`${basePackage}.core`]: coreNames.sort(),
    [`${basePackage}.core.http`]: ['Headers', 'QueryParams']
  }

  if (datetimes.length) {
    imports['java.time'] = [
      ...new Set(datetimes.map(date => (date === 'local-date' ? 'LocalDate' : 'OffsetDateTime')))
    ].sort()
  }

  if (datetimes.includes('offset-date-time')) {
    imports['java.time.format'] = ['DateTimeFormatter']
  }

  if (hasEnum) {
    imports['com.fasterxml.jackson.annotation'] = ['JsonCreator']
    imports[`${basePackage}.errors`] = [`${exceptionPrefix}InvalidDataException`]
  }

  return imports
}
