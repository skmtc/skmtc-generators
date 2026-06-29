import { capitalize, camelCase } from '@skmtc/core'
import { join } from '@std/path'
import { getBaseNamespace } from './baseNamespace.ts'

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

/**
 * The service-seam interface name: `users` → `IUsersService`. The `I`
 * prefix is IDIOMATIC for C# interfaces — the convention D14 dodged
 * for data parents is exactly right for the seam (CC2).
 */
export const toServiceName = (tag: string): string => {
  return `I${toTagBase(tag)}Service`
}

/** The controller class name: `users` → `UsersController`. */
export const toControllerName = (tag: string): string => {
  return `${toTagBase(tag)}Controller`
}

/**
 * The tag file's export path — ONE file per tag holding both the
 * service interface and the controller (the note-25 amendment: a
 * single destination keeps inline-shape synthesis and imports
 * deduplicated). Segments after `@/` ARE the namespace directories.
 */
export const toApiExportPath = (tag: string): string => {
  return join('@', ...getBaseNamespace().split('.'), `${toTagBase(tag)}Api.generated.cs`)
}
