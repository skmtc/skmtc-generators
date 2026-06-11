export { toCsharpEntry, type CsharpEntryOptions } from './src/mod.ts'
export { CsRecordProjection } from './src/CsRecordProjection.ts'
export { CsEnumProjection } from './src/CsEnumProjection.ts'
export { CsAbstractRecordProjection } from './src/CsAbstractRecordProjection.ts'
export { CsPolymorphicParentValue } from './src/CsPolymorphicParentValue.ts'
export {
  isPolymorphicUnion,
  toPolymorphicMembership,
  toMemberTag,
  type PolymorphicParent
} from './src/polymorphicMembership.ts'
export {
  getUnionHint,
  getInvalidUnionHint,
  markInvalidUnionHint,
  type UnionHint
} from './src/unionHints.ts'
export {
  modelEnrichmentSchema,
  toModelAlias,
  toCsModelDisplayName,
  type ModelEnrichment
} from './src/modelNames.ts'
export {
  toCsProjection,
  toCsProjectionForRef,
  peekSchema,
  type CsProjection
} from './src/toCsProjection.ts'
export { toCsValue, type CsValueArgs } from './src/Cs.ts'
export { CsRecordValue } from './src/CsRecordValue.ts'
export { CsEnumMembers } from './src/CsEnumMembers.ts'
export { CsObjectValue, CsDictionary } from './src/CsObjectValue.ts'
export { CsArray } from './src/CsArray.ts'
export { CsRef } from './src/CsRef.ts'
export { CsString } from './src/CsString.ts'
export { CsBoolean, CsInteger, CsNumber, CsVoid } from './src/CsPrimitives.ts'
export { CsUnion, CsUnknown } from './src/CsJsonValues.ts'
export { applyModifiers } from './src/applyModifiers.ts'
export { toEnumValues } from './src/toEnumValues.ts'
export {
  toCsModelName,
  toCsModelExportPath,
  CsAbstractRecordBase,
  CsRecordBase,
  CsEnumBase
} from './src/base.ts'
export { setBaseNamespace, getBaseNamespace, resetBaseNamespace } from './src/baseNamespace.ts'
export {
  setCustomScalars,
  getCustomScalar,
  getCustomScalarMap,
  resetCustomScalars,
  logUnknownFormatOnce
} from './src/scalars.ts'
