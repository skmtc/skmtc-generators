import type { GenerateContextType, OasObject, OasOperation, OasRef, OasSchema } from '@skmtc/core'
import { CustomValue } from '@skmtc/core'
import invariant from 'tiny-invariant'
import { KtDefinition, createClass, register } from '@skmtc/lang-kotlin'
import { sdkConfig as config } from '@/config.ts'
import { generatedFileHeader } from '@/generatedFileHeader.ts'
import { toStructuralHash, type SharedHashes } from '@/model/structuralHash.ts'
import { SdkModelValue } from '@/model/SdkModelValue.ts'

export type EnsureSharedModelsResult = {
  sharedHashes: SharedHashes
}

/**
 * The §C5 mechanism: builds the config-asserted shared models
 * (`extracted` — replace structurally-identical inline occurrences;
 * `envelope` — the response-wrapper class) once per run, and returns
 * the structural-hash map the response-model walker matches against.
 * Registration is `findDefinition`-guarded (accumulator pattern).
 */
export const ensureSharedModels = (context: GenerateContextType): EnsureSharedModelsResult => {
  const envelopeConfig = config.sharedModels.envelope

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
      className,
      destinationPath: `${modelsRoot}/${className}.kt`,
      schema,
      sharedHashes,
      sorted: true
    })
  }

  if (envelopeConfig) {
    const envelopeSource = toResponseSchema(
      findOperation(context, envelopeConfig.source.path, envelopeConfig.source.method)
    )

    ensureModelDefinition({
      context,
      className: envelopeConfig.className,
      destinationPath: `${modelsRoot}/${envelopeConfig.className}.kt`,
      schema: envelopeSource,
      sharedHashes,
      includeOnly: envelopeConfig.fields
    })
  }

  return { sharedHashes }
}

type EnsureModelDefinitionArgs = {
  context: GenerateContextType
  className: string
  destinationPath: string
  schema: OasObject
  sharedHashes: SharedHashes
  sorted?: boolean
  includeOnly?: string[]
}

const ensureModelDefinition = ({
  context,
  className,
  destinationPath,
  schema,
  sharedHashes,
  sorted,
  includeOnly
}: EnsureModelDefinitionArgs): void => {
  if (context.findDefinition({ name: className, exportPath: destinationPath })) {
    return
  }

  const value = new SdkModelValue({
    context,
    schema,
    className,
    destinationPath,
    fileHeader: generatedFileHeader,
    sharedHashes,
    sorted,
    includeOnly
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
