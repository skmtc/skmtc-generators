import { capitalize, camelCase } from '@skmtc/core'
import { join } from '@std/path'
import { getBasePackage } from './basePackage.ts'

/**
 * The tag an operation groups under: the FIRST tag, or `'Default'`
 * when untagged (a multi-tag operation joins its first tag only).
 */
export const toApiTag = (tags: string[] | undefined): string => {
  return tags?.[0] ?? 'Default'
}

/** PascalCase base from a tag: `credit notes` → `CreditNotes`. */
export const toTagBase = (tag: string): string => {
  return capitalize(camelCase(tag))
}

/** The service-seam interface name: `users` → `UsersService`. */
export const toServiceName = (tag: string): string => {
  return `${toTagBase(tag)}Service`
}

/** The controller class name: `users` → `UsersController`. */
export const toControllerName = (tag: string): string => {
  return `${toTagBase(tag)}Controller`
}

/**
 * The tag file's export path — ONE file per tag holding both the
 * service interface and the controller (the note-25 amendment: a
 * single destination keeps inline-shape synthesis and imports
 * deduplicated). Segments after `@/` ARE the package directories.
 */
export const toApiExportPath = (tag: string): string => {
  return join('@', ...getBasePackage().split('.'), `${toTagBase(tag)}Api.generated.kt`)
}
