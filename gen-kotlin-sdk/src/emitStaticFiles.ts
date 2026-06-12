import type { GenerateContextType } from '@skmtc/core'
import { KtDefinition, createVerbatim, register } from '@skmtc/lang-kotlin'
import templates from '../templates/static-files.json' with { type: 'json' }
import { toScreamingPrefix, type SdkConfig } from './SdkConfig.ts'

export type StaticFile = {
  module: string
  relPath: string
  header: string
  imports: Record<string, string[]>
  body: string
}

/** Per-target template overlay (corpus harness only — §KS-F F2). */
export type StaticFilesOverlay = {
  files: StaticFile[]
}

type EmitStaticFilesArgs = {
  context: GenerateContextType
  config: SdkConfig
  /** Entries replacing/extending the base set, keyed (module, relPath). */
  overlay?: StaticFilesOverlay
}

/**
 * Emits the spec-independent half of the SDK — the `core/` + `errors/`
 * runtime and the `client-okhttp` module — from the compiled template
 * data (`templates/static-files.json`, produced by the corpus-side
 * template compiler; attribution in `templates/NOTICE.md`). Each file
 * flows through the NORMAL register path: imports re-sort on the
 * substituted names, the attribution header rides `fileHeader`, the
 * body is one `verbatim` Definition.
 *
 * Idempotent per run: the first template's destination file existing
 * means a previous transform call already emitted everything.
 */
export const emitStaticFiles = ({ context, config, overlay }: EmitStaticFilesArgs): void => {
  const substitute = toSubstitute(config)

  // The JSON import infers literal per-file import keys (with
  // optional members) — normalize to the structural StaticFile shape.
  const files = mergeOverlay(templates.files.map(toStaticFile), overlay)

  const [first] = files

  if (context.getFile(toDestinationPath({ file: first, config, substitute }))) {
    return
  }

  for (const file of files) {
    const destinationPath = toDestinationPath({ file, config, substitute })

    const imports = Object.fromEntries(
      Object.entries(file.imports).map(([module, names]) => [substitute(module), names])
    )

    const body = substitute(file.body)
    const definitionName = file.relPath.replace(/^.*\//, '').replace(/\.kt$/, '')

    register(context, {
      imports,
      definitions: [
        new KtDefinition({
          context,
          identifier: createVerbatim(substitute(definitionName)),
          value: body
        })
      ],
      fileHeader: substitute(file.header),
      destinationPath
    })
  }
}

const toStaticFile = (file: {
  module: string
  relPath: string
  header: string
  imports: Record<string, string[] | undefined>
  body: string
}): StaticFile => ({
  module: file.module,
  relPath: file.relPath,
  header: file.header,
  body: file.body,
  imports: Object.fromEntries(
    Object.entries(file.imports).flatMap(([key, names]) => (names ? [[key, names]] : []))
  )
})

const mergeOverlay = (base: StaticFile[], overlay?: StaticFilesOverlay): StaticFile[] => {
  if (!overlay?.files.length) {
    return base
  }

  const overlayByKey = new Map(overlay.files.map(file => [`${file.module}\u0000${file.relPath}`, file]))
  const baseKeys = new Set(base.map(file => `${file.module}\u0000${file.relPath}`))

  const replaced = base.map(file => overlayByKey.get(`${file.module}\u0000${file.relPath}`) ?? file)
  const added = overlay.files.filter(file => !baseKeys.has(`${file.module}\u0000${file.relPath}`))

  return [...replaced, ...added]
}

type ToDestinationPathArgs = {
  file: StaticFile
  config: SdkConfig
  substitute: (text: string) => string
}

const toDestinationPath = ({ file, config, substitute }: ToDestinationPathArgs): string => {
  const moduleDir = `${config.artifactName}-${file.module === 'core' ? 'core' : 'client-okhttp'}`
  const packageDirs = config.basePackage.split('.').join('/')

  return `${moduleDir}/src/main/kotlin/${packageDirs}/${substitute(file.relPath)}`
}

const toSubstitute = (config: SdkConfig): ((text: string) => string) => {
  const values: Record<string, string> = {
    PKG: config.basePackage,
    PREFIX: config.clientPrefix,
    PREFIX_SCREAM: toScreamingPrefix(config.clientPrefix),
    PREFIX_LOWER: config.clientPrefix.toLowerCase(),
    ARTIFACT: config.artifactName,
    SLUG: config.repoSlug,
    BASE_URL: config.baseUrl,
    AUTH_ENV_VAR: config.auth.envVar,
    AUTH_PROPERTY: config.auth.propertyName,
    ...(config.sandboxUrl ? { SANDBOX_URL: config.sandboxUrl } : {}),
    ...(config.webhookSecretEnvVar
      ? { WEBHOOK_SECRET_ENV_VAR: config.webhookSecretEnvVar }
      : {})
  }

  return text =>
    text.replace(/\{\{([A-Z_]+)\}\}/g, (match, token: string) => {
      const value = values[token]

      if (value === undefined) {
        throw new Error(`@skmtc/gen-kotlin-sdk: unknown template token '${match}'`)
      }

      return value
    })
}
