import { camelCase, capitalize } from '@skmtc/core'
import type { GenerateContextType, OasOperation } from '@skmtc/core'
import { createClass, createInterface, toOasOperationProjectionBase } from '@skmtc/lang-kotlin'
import invariant from 'tiny-invariant'
import { sdkConfig as config } from '@/config.ts'
import { toEnrichmentSchema, type SdkOperationEnrichment } from '@/enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const packageDirs = config.basePackage.split('.').join('/')
export const coreModuleRoot = `${config.artifactName}-core/src/main/kotlin/${packageDirs}`

const toModelsDir = (resourceDir: string): string =>
  config.modelsLayout === 'flat' ? 'models' : `models/${resourceDir}`

export const toClassStem = (enrichment: NonNullable<SdkOperationEnrichment>): string => {
  const resourceTail = enrichment.resource[enrichment.resource.length - 1]

  invariant(resourceTail, '@skmtc/gen-kotlin-sdk: enrichment resource path is empty')

  return enrichment.classStem ?? capitalize(camelCase(resourceTail))
}

export const ResponseModelBase = toOasOperationProjectionBase<SdkOperationEnrichment>({
  id: denoJson.name,
  toEnrichmentSchema,
  toIdentifier({ operation, enrichments, variant }) {
    // Statics may be probed for unenriched operations (which the
    // transform never inserts); give them a deterministic name.
    // Variants-unaware: `variant` is destructured but unused.
    void variant

    if (!enrichments) {
      return createClass(`Unenriched${capitalize(camelCase(operation.path))}Response`)
    }

    return createClass(
      `${toClassStem(enrichments)}${capitalize(camelCase(enrichments.method))}Response`
    )
  },
  toExportPath({ operation, enrichments, variant }) {
    const { name } = this.toIdentifier({ operation, enrichments, variant })

    const resourceDir = enrichments
      ? enrichments.resource.join('').toLowerCase()
      : 'unenriched'

    return `${coreModuleRoot}/${toModelsDir(resourceDir)}/${name}.kt`
  }
})

export const ParamsBase = toOasOperationProjectionBase<SdkOperationEnrichment>({
  id: denoJson.name,
  toEnrichmentSchema,
  toIdentifier({ operation, enrichments, variant }) {
    void variant

    if (!enrichments) {
      return createClass(`Unenriched${capitalize(camelCase(operation.path))}Params`)
    }

    return createClass(
      `${toClassStem(enrichments)}${capitalize(camelCase(enrichments.method))}Params`
    )
  },
  toExportPath({ operation, enrichments, variant }) {
    const { name } = this.toIdentifier({ operation, enrichments, variant })

    const resourceDir = enrichments
      ? enrichments.resource.join('').toLowerCase()
      : 'unenriched'

    return `${coreModuleRoot}/${toModelsDir(resourceDir)}/${name}.kt`
  }
})

export type ServiceFlavor = 'blocking' | 'async'
export type ServiceRole = 'interface' | 'impl'

export const toServiceBase = (flavor: ServiceFlavor, role: ServiceRole) => {
  const nameSuffix = `Service${flavor === 'async' ? 'Async' : ''}${role === 'impl' ? 'Impl' : ''}`
  const directory = flavor === 'async' ? 'async' : 'blocking'

  return toOasOperationProjectionBase<SdkOperationEnrichment>({
    id: denoJson.name,
    toEnrichmentSchema,
    toIdentifier({ operation, enrichments, variant }) {
      void variant

      if (!enrichments) {
        return createClass(`Unenriched${capitalize(camelCase(operation.path))}${nameSuffix}`)
      }

      const name = `${toClassStem(enrichments)}${nameSuffix}`

      return role === 'interface' ? createInterface(name) : createClass(name)
    },
    toExportPath({ operation, enrichments, variant }) {
      const { name } = this.toIdentifier({ operation, enrichments, variant })

      return `${coreModuleRoot}/services/${directory}/${name}.kt`
    }
  })
}

/** Per-operation enrichment lookup shared by services and the client. */
export const resolveEnrichment = (context: GenerateContextType) => (operation: OasOperation) =>
  ResponseModelBase.toEnrichments({ operation, context, variant: 'main' })
