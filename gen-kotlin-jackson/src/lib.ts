import { join } from '@std/path'
import { toGeneratorEnrichment } from '@skmtc/core'
import type { GenerateContextType } from '@skmtc/core'
import denoJson from '../deno.json' with { type: 'json' }
import { generatorConfigSchema } from './enrichments.ts'

/**
 * SLOT(library): the emitted library, in one place.
 *
 * Jackson's databind annotations live in one package and this generator
 * emits exactly one of them, so both the package and the symbol are
 * constants rather than a `LIB` object composed into every render body.
 * `KtAnnotation` registers the import itself when handed `packageName`.
 */
export const JACKSON_ANNOTATION_PACKAGE = 'com.fasterxml.jackson.annotation'
export const JSON_PROPERTY = 'JsonProperty'

/** Home of `JsonNode` — the honest wire type for non-sealed unions. */
export const JACKSON_DATABIND_PACKAGE = 'com.fasterxml.jackson.databind'

/**
 * Home of the date types. Unlike `kotlin.*`, `java.time` is not imported
 * into every file by the compiler, so a date-typed property registers it.
 */
export const JAVA_TIME_PACKAGE = 'java.time'

/**
 * The `format` values of `type: string` that have a Kotlin type.
 *
 * `date-time` is RFC 3339, which always carries an offset, so
 * `OffsetDateTime` keeps what the wire held — `Instant` would normalize it
 * to UTC and discard it. Jackson binds both through
 * `jackson-datatype-jsr310`, which `spring-boot-starter-web` already brings
 * in via `spring-boot-starter-json`; a consumer using this generator
 * WITHOUT Spring Boot has to add it themselves.
 *
 * Other formats (`uuid`, `uri`, `time`, `duration`, `byte`) have obvious
 * Kotlin types too and are deliberately not mapped yet — each one changes
 * a type consumers may already depend on.
 *
 * A `Map`, not a record: `format` is open-ended and author-controlled, so
 * an index into a record would resolve `Object.prototype` members —
 * `format: 'constructor'` yielding a function that renders as a type.
 */
export const STRING_FORMAT_TYPES: ReadonlyMap<string, string> = new Map([
  ['date', 'LocalDate'],
  ['date-time', 'OffsetDateTime']
])

/**
 * The models-package file a named declaration lands in — the single
 * path policy behind `toExportPath` AND every synthesized declaration.
 * An INLINE union's sealed interface cannot live in its referencing
 * file: Kotlin requires sealed subtypes in the PARENT'S package, and
 * the members are component models living here — so the parent joins
 * them, and the referencing file imports it by name.
 *
 * The package comes from the REQUIRED `generator`-scope `basePackage`
 * enrichment (validated in enrichments.ts — no default: a placeholder
 * would ship `com.example.*` into consumer code). The export path's
 * directory segments ARE the package
 * (`@/com/acme/models/Order.generated.kt` → `package com.acme.models`),
 * and all models sharing the one configured package is what makes
 * `KtFile`'s same-package suppression drop every cross-model import.
 *
 * Two callers, one formula: sites holding `context` use
 * {@link toModelExportPath}; `base.ts`'s `toExportPath` — which
 * receives the validated enrichments instead of context — uses
 * {@link toModelExportPathInPackage} directly. Both MUST resolve the
 * same package or the cache key and the synthesized placement drift.
 */
export const toModelExportPathInPackage = (basePackage: string, name: string): string => {
  return join('@', ...basePackage.split('.'), `${name}.generated.kt`)
}

export const toModelExportPath = (context: GenerateContextType, name: string): string => {
  return toModelExportPathInPackage(toBasePackage(context), name)
}

/** The validated generator-scope package, read off context at need. */
export const toBasePackage = (context: GenerateContextType): string => {
  return toGeneratorEnrichment(context, denoJson.name, generatorConfigSchema).basePackage
}
