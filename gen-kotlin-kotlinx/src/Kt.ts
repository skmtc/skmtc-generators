import { match } from 'ts-pattern'
import { toGeneratorOnlyKey, toRefName } from '@skmtc/core'
import type { GenerateContextType, Modifiers, RefName, SchemaType } from '@skmtc/core'
import { KtString } from './KtString.ts'
import { KtArray } from './KtArray.ts'
import { KtRef } from './KtRef.ts'
import { KtObjectValue } from './KtObjectValue.ts'
import { KtBoolean, KtInteger, KtNumber, KtVoid } from './KtPrimitives.ts'
import { KtUnion, KtUnknown } from './KtJsonValues.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * Arguments for {@link toKtValue} — the engine's `TypeSystemArgs` plus
 * `fallbackName`, the naming hint for constructs Kotlin must synthesize
 * as named siblings (inline objects → data classes, inline string enums
 * → enum classes; Kotlin has no anonymous shapes). Parents extend the
 * chain per property/item: `User` → `UserAddress` → `UserAddressItem`.
 */
export type KtValueArgs = {
  schema: SchemaType
  destinationPath: string
  required: boolean | undefined
  context: GenerateContextType
  rootRef?: RefName
  fallbackName: string
}

/**
 * Maps a parsed schema node to its Kotlin snippet — the gen-typescript
 * `toTsValue` analog. Nullability collapses into the type expression's
 * `?` (`applyModifiers`): nullable OR optional → nullable Kotlin type;
 * the `= null` parameter default is the parameter layer's job.
 */
// NOTE: the return type is deliberately inferred (the precise union of the
// Kt* snippet classes) — annotating the broader `TypeSystemValue` would
// include `TypeSystemNever`/`TypeSystemNull`, which the `SchemaToValueFn`
// output union excludes, breaking the static `schemaToValueFn` assignment.
export const toKtValue = ({
  schema,
  destinationPath,
  required,
  context,
  rootRef,
  fallbackName
}: KtValueArgs) => {
  const modifiers: Modifiers = {
    required,
    nullable: 'nullable' in schema ? schema.nullable : undefined
  }

  const generatorKey = toGeneratorOnlyKey({ generatorId: denoJson.name })

  return match(schema satisfies SchemaType)
    .with({ type: 'custom' }, custom => custom)
    .with({ type: 'ref' }, ref => {
      return new KtRef({
        context,
        destinationPath,
        refName: toRefName(ref.$ref),
        modifiers,
        rootRef,
        schema: ref
      })
    })
    .with({ type: 'array' }, arraySchema => {
      return new KtArray({
        context,
        destinationPath,
        modifiers,
        items: arraySchema.items,
        generatorKey,
        rootRef,
        schema: arraySchema,
        fallbackName
      })
    })
    .with({ type: 'object' }, objectSchema => {
      return new KtObjectValue({
        context,
        destinationPath,
        value: objectSchema,
        modifiers,
        generatorKey,
        rootRef,
        fallbackName
      })
    })
    .with({ type: 'union' }, unionSchema => {
      return new KtUnion({
        context,
        destinationPath,
        modifiers,
        generatorKey,
        schema: unionSchema
      })
    })
    .with({ type: 'number' }, numberSchema => {
      return new KtNumber({ context, modifiers, generatorKey, schema: numberSchema })
    })
    .with({ type: 'integer' }, integerSchema => {
      return new KtInteger({ context, modifiers, generatorKey, schema: integerSchema })
    })
    .with({ type: 'boolean' }, booleanSchema => {
      return new KtBoolean({ context, modifiers, generatorKey, schema: booleanSchema })
    })
    .with({ type: 'void' }, () => new KtVoid({ context, generatorKey }))
    .with({ type: 'string' }, stringSchema => {
      return new KtString({
        context,
        stringSchema,
        modifiers,
        generatorKey,
        destinationPath,
        fallbackName
      })
    })
    .with({ type: 'unknown' }, unknownSchema => {
      return new KtUnknown({
        context,
        generatorKey,
        destinationPath,
        modifiers,
        schema: unknownSchema
      })
    })
    .exhaustive()
}

// `peekSchema` moved to its own leaf module (`peekSchema.ts`) so `base.ts`
// can use it from `toIdentifierType` without a module-init cycle; re-exported
// here for the package surface and existing import sites.
export { peekSchema } from './peekSchema.ts'
