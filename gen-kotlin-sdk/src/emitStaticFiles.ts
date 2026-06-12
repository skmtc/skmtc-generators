import type { GenerateContextType } from '@skmtc/core'
import { KtDefinition, createVerbatim, register } from '@skmtc/lang-kotlin'
import templates from '../templates/static-files.json' with { type: 'json' }
import { toScreamingPrefix, type SdkConfig } from './SdkConfig.ts'

type StaticFile = (typeof templates)['files'][number]

type EmitStaticFilesArgs = {
  context: GenerateContextType
  config: SdkConfig
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
export const emitStaticFiles = ({ context, config }: EmitStaticFilesArgs): void => {
  const substitute = toSubstitute(config)

  const [first] = templates.files

  if (context.getFile(toDestinationPath({ file: first, config, substitute }))) {
    return
  }

  for (const file of templates.files) {
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
    AUTH_PROPERTY: config.auth.propertyName
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
