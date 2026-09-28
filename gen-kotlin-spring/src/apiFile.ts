import { capitalize, camelCase } from '@skmtc/core'
import { toExportPathInPackage } from '@skmtc/gen-kotlin-jackson'

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

/**
 * The generated implementation's class name: `users` → `DefaultUsersService`.
 * The `Default` prefix is Spring's own convention for the standard
 * implementation of an interface, and unlike an `Impl` suffix it still reads
 * correctly once the consumer has replaced the bodies with real logic.
 */
export const toServiceImplementationName = (tag: string): string => {
  return `Default${toTagBase(tag)}Service`
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
export const toApiExportPath = (tag: string, basePackage: string): string => {
  return toExportPathInPackage(basePackage, `${toTagBase(tag)}Api`)
}

/**
 * The implementation scaffold's export path — the same package as the tag
 * file, so the class needs no import of the interface it implements, and its
 * own file so `skmtc eject` can hand it over one tag at a time.
 */
export const toServiceImplementationExportPath = (tag: string, basePackage: string): string => {
  return toExportPathInPackage(basePackage, toServiceImplementationName(tag))
}
