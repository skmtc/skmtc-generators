import { isValidatable, type SdkModel, type SdkType } from './SdkModel.ts'

type ModelImportsArgs = {
  model: SdkModel
  basePackage: string
  exceptionPrefix: string
  envelopeClassName: string
}

/**
 * The import set a model file needs — computed from the domain record
 * (T2: presence of a section implies presence of its imports). Module
 * keys are dotted packages; `KtFile` sorts and suppresses same-package
 * entries at render.
 */
export const toModelImports = ({
  model,
  basePackage,
  exceptionPrefix,
  envelopeClassName
}: ModelImportsArgs): Record<string, string[]> => {
  const facts = collectFacts(model)

  const coreNames = ['ExcludeMissing', 'JsonField', 'JsonMissing', 'JsonValue']

  if (facts.hasRequired) {
    coreNames.push('checkRequired')
  }

  if (facts.hasList) {
    coreNames.push('checkKnown', 'toImmutable')
  }

  if (facts.hasEnum) {
    coreNames.push('Enum')
  }

  const imports: Record<string, string[]> = {
    'com.fasterxml.jackson.annotation': [
      'JsonAnyGetter',
      'JsonAnySetter',
      'JsonCreator',
      'JsonProperty'
    ],
    'java.util': ['Collections', 'Objects'],
    [`${basePackage}.core`]: coreNames.sort(),
    [`${basePackage}.errors`]: [`${exceptionPrefix}InvalidDataException`]
  }

  const modelsPackageNames = [...facts.sharedClassNames]

  if (model.envelope) {
    modelsPackageNames.push(envelopeClassName)
  }

  if (modelsPackageNames.length) {
    imports[`${basePackage}.models`] = [...new Set(modelsPackageNames)].sort()
  }

  return imports
}

type ImportFacts = {
  hasRequired: boolean
  hasList: boolean
  hasEnum: boolean
  sharedClassNames: Set<string>
}

const collectFacts = (model: SdkModel): ImportFacts => {
  const facts: ImportFacts = {
    hasRequired: false,
    hasList: false,
    hasEnum: false,
    sharedClassNames: new Set()
  }

  visitModel(model, facts)

  return facts
}

const visitModel = (model: SdkModel, facts: ImportFacts): void => {
  for (const field of model.fields) {
    if (field.required) {
      facts.hasRequired = true
    }

    visitType(field.type, facts)
  }
}

const visitType = (type: SdkType, facts: ImportFacts): void => {
  switch (type.kind) {
    case 'list':
      facts.hasList = true
      visitType(type.element, facts)
      return
    case 'model':
      visitModel(type.model, facts)
      return
    case 'enum':
      facts.hasEnum = true
      return
    case 'shared':
      facts.sharedClassNames.add(type.className)
      return
    case 'scalar':
      return
    default: {
      const _exhaustive: never = type
      throw new Error(`Unhandled SdkType: ${JSON.stringify(_exhaustive)}`)
    }
  }
}
