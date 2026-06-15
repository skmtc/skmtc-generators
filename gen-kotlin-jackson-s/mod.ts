/**
 * `@skmtc/gen-kotlin-jackson-s` — the Jackson/Stainless model-shape
 * engine extracted from `gen-kotlin-sdk`. The SDK reaches the model
 * layer by importing from here; its `sharedModels.ts` policy and
 * operation projections stay in the SDK. The model identity config is
 * read from the shared `_stack` enrichment (`getModelConfig`), so no
 * generator pushes config into another.
 */

export { jacksonSEntry, default } from '@/mod.ts'
export { toJacksonSModelName, toJacksonSModelExportPath } from '@/base.ts'

export { type ModelConfig, modelConfigSchema, getModelConfig } from '@/modelConfig.ts'

export { SdkModelValue, type SdkModelValueArgs } from '@/model/SdkModelValue.ts'

export {
  ModelField,
  ListModelField,
  type AddField,
  addMethodKdoc,
  requiredFieldsFence
} from '@/model/ModelField.ts'

export { toModelFields, orderSortedFields, shadowFields } from '@/model/toModelFields.ts'

export { toStructuralHash, type SharedHashes } from '@/model/structuralHash.ts'

export { NestedModelClass } from '@/model/sections/NestedModelClass.ts'

export {
  type KtType,
  type KtScalar,
  KtScalarType,
  KtDatetimeType,
  KtListType,
  KtNestedClassType,
  KtEnumType,
  KtSharedRefType
} from '@/model/types/KtTypes.ts'

export { toKtType } from '@/model/types/toKtType.ts'
