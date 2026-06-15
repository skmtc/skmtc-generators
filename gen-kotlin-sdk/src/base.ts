import { camelCase, capitalize } from '@skmtc/core'
import type { GenerateContextType, OasOperation } from '@skmtc/core'
import { toKtOasOperationProjectionBase } from '@skmtc/lang-kotlin'
import invariant from 'tiny-invariant'
import type { SdkConfig } from '@/SdkConfig.ts'
import {
  toEnrichmentSchema,
  type EnrichmentSchema,
  type SdkOperationEnrichment
} from '@/enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

/** `<artifactName>-core/src/main/kotlin/<basePackage dirs>` — the core
 * module root every generated `core` file lands under. */
export const toCoreModuleRoot = (config: SdkConfig): string =>
  `${config.artifactName}-core/src/main/kotlin/${config.basePackage.split('.').join('/')}`

const toModelsDir = (config: SdkConfig, resourceDir: string): string =>
  config.modelsLayout === 'flat' ? 'models' : `models/${resourceDir}`

export const toClassStem = (enrichment: NonNullable<SdkOperationEnrichment>): string => {
  const resourceTail = enrichment.resource[enrichment.resource.length - 1]

  invariant(resourceTail, '@skmtc/gen-kotlin-sdk: enrichment resource path is empty')

  return enrichment.classStem ?? capitalize(camelCase(resourceTail))
}

export const ResponseModelBase = toKtOasOperationProjectionBase<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,
  toIdentifierName({ operation, enrichments, variant }) {
    // Statics may be probed for unenriched operations (which the
    // transform never inserts); give them a deterministic name.
    // Variants-unaware: `variant` is destructured but unused.
    void variant

    // The per-operation Stainless config is the umbrella's `subject` leaf.
    const subject = enrichments.subject

    if (!subject) {
      return `Unenriched${capitalize(camelCase(operation.path))}Response`
    }

    return `${toClassStem(subject)}${capitalize(camelCase(subject.method))}Response`
  },
  toIdentifierType: () => ({ kind: 'class' }),
  toExportPath({ operation, enrichments, variant }) {
    const name = this.toIdentifierName({ operation, enrichments, variant })

    const subject = enrichments.subject

    const resourceDir = subject
      ? subject.resource.join('').toLowerCase()
      : 'unenriched'

    return `${toCoreModuleRoot(enrichments.stack)}/${toModelsDir(enrichments.stack, resourceDir)}/${name}.kt`
  }
})

export const ParamsBase = toKtOasOperationProjectionBase<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,
  toIdentifierName({ operation, enrichments, variant }) {
    void variant

    const subject = enrichments.subject

    if (!subject) {
      return `Unenriched${capitalize(camelCase(operation.path))}Params`
    }

    return `${toClassStem(subject)}${capitalize(camelCase(subject.method))}Params`
  },
  toIdentifierType: () => ({ kind: 'class' }),
  toExportPath({ operation, enrichments, variant }) {
    const name = this.toIdentifierName({ operation, enrichments, variant })

    const subject = enrichments.subject

    const resourceDir = subject
      ? subject.resource.join('').toLowerCase()
      : 'unenriched'

    return `${toCoreModuleRoot(enrichments.stack)}/${toModelsDir(enrichments.stack, resourceDir)}/${name}.kt`
  }
})

export type ServiceFlavor = 'blocking' | 'async'
export type ServiceRole = 'interface' | 'impl'

export const toServiceBase = (flavor: ServiceFlavor, role: ServiceRole) => {
  const nameSuffix = `Service${flavor === 'async' ? 'Async' : ''}${role === 'impl' ? 'Impl' : ''}`
  const directory = flavor === 'async' ? 'async' : 'blocking'

  return toKtOasOperationProjectionBase<EnrichmentSchema>({
    id: denoJson.name,
    toEnrichmentSchema,
    toIdentifierName({ operation, enrichments, variant }) {
      void variant

      const subject = enrichments.subject

      if (!subject) {
        return `Unenriched${capitalize(camelCase(operation.path))}${nameSuffix}`
      }

      return `${toClassStem(subject)}${nameSuffix}`
    },
    // Constant per base instance: the kind depends on `role` (a closure
    // parameter known at construction), not the schema — interface bases
    // declare `interface`, impl bases `class`.
    toIdentifierType: () => ({ kind: role === 'interface' ? 'interface' : 'class' }),
    toExportPath({ operation, enrichments, variant }) {
      const name = this.toIdentifierName({ operation, enrichments, variant })

      return `${toCoreModuleRoot(enrichments.stack)}/services/${directory}/${name}.kt`
    }
  })
}

/**
 * Per-operation enrichment lookup shared by services and the client.
 * `toEnrichments` returns the `{ subject, generator, stack }` umbrella;
 * downstream consumers want the per-operation Stainless config, so this
 * unwraps to the `subject` leaf.
 */
export const resolveEnrichment =
  (context: GenerateContextType) =>
  (operation: OasOperation): SdkOperationEnrichment =>
    ResponseModelBase.toEnrichments({ operation, context, variant: 'main' }).subject
