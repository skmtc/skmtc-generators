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

export type ServiceFlavor = 'blocking' | 'async'
export type ServiceRole = 'interface' | 'impl'

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

/** The identity-static args a projection's `toIdentifierName`/`toExportPath`
 * override receives (the `variant` field is unused — variants-unaware). */
type IdentifierArgs = { operation: OasOperation; enrichments: EnrichmentSchema }

/**
 * Per-OPERATION name (Response / Params): enriched `${stem}${Method}<suffix>`,
 * unenriched `Unenriched${path}<suffix>` (statics may be probed for
 * unenriched operations the transform never inserts). Each model projection's
 * `toIdentifierName` override calls this with its suffix.
 */
export const toOperationName = ({ operation, enrichments }: IdentifierArgs, suffix: string): string => {
  const subject = enrichments.subject

  if (!subject) {
    return `Unenriched${capitalize(camelCase(operation.path))}${suffix}`
  }

  return `${toClassStem(subject)}${capitalize(camelCase(subject.method))}${suffix}`
}

/**
 * Per-RESOURCE name (services): enriched `${stem}<suffix>` — NO method, since a
 * service spans all of a resource's operations (`CardService`, not
 * `CardCreateService`). Unenriched form matches {@link toOperationName}.
 */
export const toResourceName = ({ operation, enrichments }: IdentifierArgs, suffix: string): string => {
  const subject = enrichments.subject

  if (!subject) {
    return `Unenriched${capitalize(camelCase(operation.path))}${suffix}`
  }

  return `${toClassStem(subject)}${suffix}`
}

const toResourceDir = (enrichments: EnrichmentSchema): string =>
  enrichments.subject ? enrichments.subject.resource.join('').toLowerCase() : 'unenriched'

/** Model export path (Response / Params): `<core>/models/<resource>/<Name>.kt`. */
export const toModelExportPath = ({ enrichments }: IdentifierArgs, name: string): string =>
  `${toCoreModuleRoot(enrichments.stack)}/${toModelsDir(enrichments.stack, toResourceDir(enrichments))}/${name}.kt`

/** Service export path: `<core>/services/<directory>/<Name>.kt`. */
export const toServiceExportPath = (
  { enrichments }: IdentifierArgs,
  directory: ServiceFlavor,
  name: string
): string => `${toCoreModuleRoot(enrichments.stack)}/services/${directory}/${name}.kt`

/**
 * THE single gen-kotlin-sdk projection base. Every projection extends it and
 * overrides `toIdentifierName` / `toIdentifierType` / `toExportPath` as needed.
 * The factory binds these statics to this config, so a projection that changes
 * the name overrides `toExportPath` too — its own override (unbound) resolves
 * the name through the shared helpers. The base default is the Response-model
 * shape, which `KtSdkResponseModel` inherits unchanged.
 */
export const SdkBase = toKtOasOperationProjectionBase<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,
  toIdentifierName: args => toOperationName(args, 'Response'),
  toIdentifierType: () => ({ type: 'class' }),
  toExportPath: args => toModelExportPath(args, toOperationName(args, 'Response'))
})

/**
 * Per-operation enrichment lookup shared by services and the client.
 * `toEnrichments` returns the `{ subject, generator, stack }` umbrella;
 * downstream consumers want the per-operation Stainless config, so this
 * unwraps to the `subject` leaf.
 */
export const resolveEnrichment =
  (context: GenerateContextType) =>
  (operation: OasOperation): SdkOperationEnrichment =>
    SdkBase.toEnrichments({ operation, context, variant: 'main' }).subject
