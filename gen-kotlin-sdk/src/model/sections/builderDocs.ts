import { capitalize } from '@skmtc/core'
import { kdoc } from '@/format.ts'
import { decapitalize, toTypeExpression, type SdkField, type SdkModel, type SdkType } from '@/model/SdkModel.ts'

/** The required-fields code fence shared by the companion and `build()` KDocs. */
export const requiredFieldsFence = (model: SdkModel): string[] => {
  const requiredFields = model.fields.filter(field => field.fenceRequired)

  if (!requiredFields.length) {
    return []
  }

  return [
    '',
    'The following fields are required:',
    '```kotlin',
    ...requiredFields.map(field => `.${field.kotlinName}()`),
    '```'
  ]
}

const toDocTypeExpression = (type: SdkType): string => {
  if (type.kind === 'list') {
    return `List<${toDocTypeExpression(type.element)}>`
  }

  return toTypeExpression(type)
}

/**
 * The "arbitrary JSON value" KDoc shared by a model field's raw setter
 * and its flattened delegate on a body-carrying Params Builder.
 * Doc references use the UNQUALIFIED form even when the code is
 * shadow-qualified (`kotlin.collections.List`).
 */
export const rawJsonSetterKdoc = (field: SdkField): string => {
  const docTypeExpression = toDocTypeExpression(field.type)
  const wellTyped =
    field.type.kind === 'list' ? `\`${docTypeExpression}\`` : `[${docTypeExpression}]`

  return kdoc([
    `Sets [Builder.${field.kotlinName}] to an arbitrary JSON value.`,
    '',
    `You should usually call [Builder.${field.kotlinName}] with a well-typed ${wellTyped} value instead. This method is primarily for setting the field to an undocumented or not yet supported value.`
  ])
}

export type AddMethodInfo = { addName: string; elementName: string; elementType: string }

/**
 * The `addX` accumulator naming for a list field: model elements name
 * the method/parameter after the class (`addAgency(agency: Agency)`);
 * scalar elements after the singularized field
 * (`addRouteId(routeId: String)`).
 */
export const toAddMethodInfo = (
  kotlinName: string,
  type: Extract<SdkType, { kind: 'list' }>
): AddMethodInfo => {
  const elementType = toTypeExpression(type.element)
  const isScalarElement = type.element.kind === 'scalar'
  const elementName = isScalarElement ? singularName(kotlinName) : decapitalize(elementType)

  return { addName: `add${capitalize(elementName)}`, elementName, elementType }
}

/** The `addX` KDoc shared by the model setter and its flattened delegate. */
export const addMethodKdoc = (elementType: string, fieldLink: string): string => {
  return kdoc([
    `Adds a single [${elementType}] to [${fieldLink}].`,
    '',
    '@throws IllegalStateException if the field was previously set to a non-list.'
  ])
}

const singularName = (name: string): string => {
  if (name.endsWith('ies')) {
    return `${name.slice(0, -3)}y`
  }

  return name.endsWith('s') && !name.endsWith('ss') ? name.slice(0, -1) : name
}
