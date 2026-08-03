import { toKtOasOperationProjectionBase } from '@skmtc/lang-kotlin'
import { join } from '@std/path'
import denoJson from '../deno.json' with { type: 'json' }
import { type EnrichmentSchema, toEnrichmentSchema } from './enrichments.ts'
import { API_PACKAGE } from './lib.ts'
import { isSupportedMethod } from './methods.ts'
import { toControllerName } from './naming.ts'

export const SpringServerBase = toKtOasOperationProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  // SLOT(naming): PascalCase, from method + path only — pure, so the
  // engine can probe the cache without constructing anything.
  toIdentifierName({ operation }): string {
    return toControllerName(operation)
  },

  // SLOT(identifier-kind): a Spring controller is a plain `class` — it
  // holds behaviour, not data, so none of the data-carrying Kotlin kinds
  // apply. Constant, so it never disagrees with the value.
  toIdentifierType: () => ({ type: 'class' }),

  // SLOT(export-path): the directory segments ARE the Kotlin package —
  // `@/com/example/api/GetApiOrdersController.generated.kt` →
  // `package com.example.api`.
  toExportPath({ operation, enrichments, variant }): string {
    const name = this.toIdentifierName({ operation, enrichments, variant })

    return join('@', ...API_PACKAGE.split('.'), `${name}.generated.kt`)
  },

  // SLOT(supported): claim only what this generator can render. Spring's
  // shorthand mapping annotations cover five methods; the rest (the
  // fixture's `head` operation among them) produce no artifact at all
  // rather than a broken one.
  isSupported: ({ operation }) => isSupportedMethod(operation.method),

  toEnrichmentSchema
})
