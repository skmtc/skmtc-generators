/**
 * SLOT(library): the emitted library, in one place.
 *
 * Every Spring MVC annotation this generator emits lives in one package,
 * so the package is a constant and the symbols are named next to it.
 * `KtAnnotation` registers the import itself when handed `packageName` —
 * one `import org.springframework.web.bind.annotation.X` per symbol,
 * exactly as the Kotlin layer's import rules require.
 */
export const SPRING_ANNOTATION_PACKAGE = 'org.springframework.web.bind.annotation'

export const REST_CONTROLLER = 'RestController'
export const PATH_VARIABLE = 'PathVariable'
export const REQUEST_PARAM = 'RequestParam'
export const REQUEST_BODY = 'RequestBody'

/**
 * SLOT(export-path) input: the Kotlin package every controller lands in.
 *
 * FIXED for this generator — no enrichment configuration is provided at
 * runtime, so the path policy is hardcoded. The export path's directory
 * segments ARE the package (`@/com/example/api/X.generated.kt` →
 * `package com.example.api`), so this constant is the single source of
 * both.
 *
 * The MODELS package is deliberately NOT a constant here: it belongs to
 * `@skmtc/gen-kotlin-jackson`, and this generator reads it off that
 * peer's identity statics (see `ModelReference`) rather than restating
 * it.
 */
export const API_PACKAGE = 'com.example.api'
