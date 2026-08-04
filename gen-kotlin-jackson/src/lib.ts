import { join } from '@std/path'

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
 * The models-package file a named declaration lands in — the single
 * path policy behind `toExportPath` AND synthesized sealed parents.
 * An INLINE union's sealed interface cannot live in its referencing
 * file: Kotlin requires sealed subtypes in the PARENT'S package, and
 * the members are component models living here — so the parent joins
 * them, and the referencing file imports it by name.
 */
export const toModelExportPath = (name: string): string => {
  return join('@', ...BASE_PACKAGE.split('.'), `${name}.generated.kt`)
}

/**
 * SLOT(export-path) input: the Kotlin package every model lands in.
 *
 * FIXED for this generator — no enrichment configuration is provided at
 * runtime, so the path policy is hardcoded. The export path's directory
 * segments ARE the package (`@/com/example/models/Order.generated.kt` →
 * `package com.example.models`), so this constant is the single source
 * of both. All models sharing one package is what makes `KtFile`'s
 * same-package suppression drop every cross-model import.
 */
export const BASE_PACKAGE = 'com.example.models'
