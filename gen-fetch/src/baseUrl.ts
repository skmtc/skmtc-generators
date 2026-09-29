import type { GenerateContextType, OasOperation } from '@skmtc/core'

type ToDefaultBaseUrlArgs = {
  operation: OasOperation
  context: GenerateContextType
  configured: string | undefined
}

/**
 * The configured base URL, else the first server of the operation, else of
 * the document, with its variables set to their defaults. A relative server
 * URL gives no default: it is relative to where the document was published,
 * which the document does not record.
 */
export const toDefaultBaseUrl = ({ operation, context, configured }: ToDefaultBaseUrlArgs): string | undefined => {
  if (configured) {
    return configured.replace(/\/+$/, '')
  }

  const document = context.document.type === 'oas' ? context.document.value : undefined
  const server = operation.servers?.[0] ?? document?.servers?.[0]

  if (!server) {
    return undefined
  }

  const url = Object.entries(server.variables ?? {}).reduce(
    (acc, [name, variable]) => acc.replaceAll(`{${name}}`, variable.default),
    server.url
  )

  return /^https?:\/\/[^{}]+$/i.test(url) ? url.replace(/\/+$/, '') : undefined
}
