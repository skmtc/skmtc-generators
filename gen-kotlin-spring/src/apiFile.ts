import { capitalize, camelCase } from '@skmtc/core'
import { join } from '@std/path'
import { getBasePackage } from './basePackage.ts'

/**
 * The tag an operation's interface groups under: the FIRST tag, or
 * `'Default'` when untagged (a multi-tag operation joins its first tag
 * only).
 */
export const toApiTag = (tags: string[] | undefined): string => {
  return tags?.[0] ?? 'Default'
}

/** Interface name from a tag: `users` → `UsersApi`. */
export const toApiName = (tag: string): string => {
  return `${capitalize(camelCase(tag))}Api`
}

/**
 * The tag file's export path: the segments after `@/` ARE the package
 * directories (`KtFile` derives the `package` directive from them), so an
 * interface lands at `@/<basePackage dirs>/<Name>.generated.kt` under the
 * Gradle source root the consumer's `basePath` points at.
 */
export const toApiExportPath = (name: string): string => {
  return join('@', ...getBasePackage().split('.'), `${name}.generated.kt`)
}
