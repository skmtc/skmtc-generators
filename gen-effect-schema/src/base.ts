import { camelCase, capitalize, decapitalize } from '@skmtc/core'
import { toTsModelProjectionBase } from '@skmtc/lang-typescript'
import denoJson from '../deno.json' with { type: 'json' }
import { type EnrichmentSchema, toEnrichmentSchema } from './enrichments.ts'
import {
  assertNotReserved,
  coerceSuffix,
  type EffectSchemaOptions,
} from './options.ts'

export const EffectBase = toTsModelProjectionBase<
  EnrichmentSchema,
  EffectSchemaOptions
>({
  id: denoJson.name,

  // Effect's convention: the schema value carries the same PascalCase
  // name as the type it decodes to (`Schema.Class<User>("User")`), so
  // `Change` here is the schema and gen-typescript's `Change` the type.
  // They live in different files; nothing imports both under one name.
  // The coerced reading is a definition of its own, so its name says so:
  // definitions are cached by name and export path. Which is also why no
  // component may carry the suffix itself.
  toIdentifierName({ refName, options }): string {
    const name = capitalize(camelCase(refName))

    assertNotReserved(name, refName)

    return `${name}${coerceSuffix(options)}`
  },

  toIdentifierType: () => ({ type: 'variable' }),

  // One file per model, in a folder of its own: gen-typescript writes
  // `@/types/user.generated.ts`, and the schema `User` decapitalizes to the
  // same file name. `this` is this base's config, so the file follows the
  // base's own name. A projection that overrides toIdentifierName keeps
  // this file unless it overrides toExportPath too.
  toExportPath({ refName, enrichments, variant, options }): string {
    const name = this.toIdentifierName({
      refName,
      enrichments,
      variant,
      options,
    })

    return `@/schema-effect/${decapitalize(name)}.generated.ts`
  },

  toEnrichmentSchema,
})

/**
 * The name a recursive model's gen-typescript type is imported under, into
 * the file that suspends it. The type shares the schema's name (above), and
 * unaliased it merges with the `export const` (TS2395) or duplicates the
 * value import (TS2300). `$` is what `camelCase` drops from every component
 * name, so no component — `NodeType` beside `Node`, say — can be called this.
 */
export const toTypeAlias = (schemaName: string): string => `${schemaName}$Type`
