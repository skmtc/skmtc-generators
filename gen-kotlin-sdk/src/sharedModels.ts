import type { GenerateContextType, OasObject, OasOperation, OasRef, OasSchema } from '@skmtc/core'
import { CustomValue } from '@skmtc/core'
import invariant from 'tiny-invariant'
import { KtDefinition, createClass, register } from '@skmtc/lang-kotlin'
import type { SdkConfig } from './SdkConfig.ts'
import { generatedFileHeader } from './generatedFileHeader.ts'
import { toSdkModel, toStructuralHash, type SharedHashes } from './model/toSdkModel.ts'
import { SdkModelValue } from './model/SdkModelValue.ts'
import type { RenderContext } from './model/renderModel.ts'

export type EnsureSharedModelsResult = {
  sharedHashes: SharedHashes
  renderContext: RenderContext
}

/**
 * The §C5 mechanism: builds the config-asserted shared models
 * (`extracted` — replace structurally-identical inline occurrences;
 * `envelope` — the response-wrapper class) once per run, and returns
 * the structural-hash map the response-model walker matches against.
 * Registration is `findDefinition`-guarded (accumulator pattern).
 */
export const ensureSharedModels = ({
  context,
  config
}: {
  context: GenerateContextType
  config: SdkConfig
}): EnsureSharedModelsResult => {
  const renderContext: RenderContext = {
    exceptionPrefix: config.clientPrefix,
    envelope: {
      className: config.sharedModels.envelope.className,
      fields: config.sharedModels.envelope.fields
    }
  }

  const packageDirs = config.basePackage.split('.').join('/')
  const modelsRoot = `${config.artifactName}-core/src/main/kotlin/${packageDirs}/models`

  const sharedHashes: SharedHashes = new Map()

  const extractedSchemas = config.sharedModels.extracted.map(entry => {
    const schema = resolvePointer({
      schema: toResponseSchema(findOperation(context, entry.source.path, entry.source.method)),
      pointer: entry.source.pointer
    })

    sharedHashes.set(toStructuralHash(schema), entry.className)

    return { className: entry.className, schema }
  })

  for (const { className, schema } of extractedSchemas) {
    invariant(
      schema.type === 'object',
      `@skmtc/gen-kotlin-sdk: shared model '${className}' must resolve to an object schema`
    )

    ensureModelDefinition({
      context,
      config,
      renderContext,
      className,
      destinationPath: `${modelsRoot}/${className}.kt`,
      model: toSdkModel({
        schema,
        className,
        sharedHashes,
        fieldStates: config.fieldStates,
        fieldEnums: config.fieldEnums,
        sortFields: true
      })
    })
  }

  const envelope = config.sharedModels.envelope
  const envelopeSource = toResponseSchema(
    findOperation(context, envelope.source.path, envelope.source.method)
  )
  const envelopeModel = toSdkModel({
    schema: envelopeSource,
    className: envelope.className,
    sharedHashes,
    fieldStates: config.fieldStates,
    fieldEnums: config.fieldEnums
  })

  ensureModelDefinition({
    context,
    config,
    renderContext,
    className: envelope.className,
    destinationPath: `${modelsRoot}/${envelope.className}.kt`,
    model: {
      ...envelopeModel,
      description: undefined,
      fields: envelopeModel.fields.filter(field => envelope.fields.includes(field.wireName))
    }
  })

  return { sharedHashes, renderContext }
}

type EnsureModelDefinitionArgs = {
  context: GenerateContextType
  config: SdkConfig
  renderContext: RenderContext
  className: string
  destinationPath: string
  model: ReturnType<typeof toSdkModel>
}

const ensureModelDefinition = ({
  context,
  config,
  renderContext,
  className,
  destinationPath,
  model
}: EnsureModelDefinitionArgs): void => {
  if (context.findDefinition({ name: className, exportPath: destinationPath })) {
    return
  }

  const value = new SdkModelValue({
    context,
    model,
    renderContext,
    basePackage: config.basePackage,
    destinationPath,
    fileHeader: generatedFileHeader
  })

  const definition = new KtDefinition({
    context,
    identifier: createClass(className),
    value
  })

  register(context, { definitions: [definition], destinationPath })
}

const findOperation = (
  context: GenerateContextType,
  path: string,
  method: string
): OasOperation => {
  invariant(context.document.type === 'oas', '@skmtc/gen-kotlin-sdk: OAS documents only')

  const operation = context.document.value.operations.find(
    operation => operation.path === path && operation.method === method
  )

  invariant(operation, `@skmtc/gen-kotlin-sdk: shared-model source operation ${method} ${path} not found`)

  return operation
}

const toResponseSchema = (operation: OasOperation): OasObject => {
  const schema = operation.toSuccessResponse()?.resolve().toSchema()?.resolve()

  invariant(
    schema && schema.type === 'object',
    `@skmtc/gen-kotlin-sdk: ${operation.method} ${operation.path} has no object response schema`
  )

  return schema
}

const resolvePointer = ({ schema, pointer }: { schema: OasObject; pointer: string }): OasSchema => {
  let current: OasSchema = schema

  for (const segment of pointer.split('/').filter(Boolean)) {
    invariant(
      current.type === 'object',
      `@skmtc/gen-kotlin-sdk: pointer '${pointer}' crosses a non-object at '${segment}'`
    )

    const property: OasSchema | OasRef<'schema'> | CustomValue | undefined =
      current.properties?.[segment]

    invariant(
      property && !(property instanceof CustomValue),
      `@skmtc/gen-kotlin-sdk: pointer '${pointer}' has no schema property '${segment}'`
    )

    current = property.isRef() ? property.resolve() : property
  }

  return current
}
