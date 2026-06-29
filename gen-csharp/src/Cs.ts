import { match } from 'ts-pattern'
import { toGeneratorOnlyKey, toRefName } from '@skmtc/core'
import type { GenerateContextType, Modifiers, RefName, SchemaType } from '@skmtc/core'
import { CsString } from './CsString.ts'
import { CsArray } from './CsArray.ts'
import { CsRef } from './CsRef.ts'
import { CsObjectValue } from './CsObjectValue.ts'
import { CsBoolean, CsInteger, CsNumber, CsVoid } from './CsPrimitives.ts'
import { CsUnion, CsUnknown } from './CsJsonValues.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * Arguments for {@link toCsValue} — the engine's `TypeSystemArgs` plus
 * two gen-csharp threads:
 *
 * - `fallbackName`: the naming hint for constructs C# must synthesize
 *   as named types (inline objects → records, inline string enums →
 *   enums; C# has no anonymous shapes). Parents extend the chain per
 *   property/item: `User` → `UserAddress` → `UserAddressItem`.
 * - `inliningTrail`: the refNames currently being INLINED (D6 — a
 *   non-declarable ref target renders as an inlined type expression).
 *   `CsRef` consults it to fail loudly on a ref-cycle of
 *   non-declarables (malformed input — a cycle must pass through a
 *   declarable node to terminate).
 */
export type CsValueArgs = {
  schema: SchemaType
  destinationPath: string
  required: boolean | undefined
  context: GenerateContextType
  rootRef?: RefName
  fallbackName: string
  inliningTrail?: RefName[]
}

/**
 * Maps a parsed schema node to its C# snippet — the gen-typescript
 * `toTsValue` analog. Nullability collapses into the type expression's
 * `?` (`applyModifiers`): nullable OR optional → nullable C# type; the
 * `[JsonIgnore(WhenWritingNull)]` attribute on optional properties is
 * the property layer's job (A1).
 */
// NOTE: the return type is deliberately inferred (the precise union of the
// Cs* snippet classes) — annotating the broader `TypeSystemValue` would
// include `TypeSystemNever`/`TypeSystemNull`, which the `SchemaToValueFn`
// output union excludes.
export const toCsValue = ({
  schema,
  destinationPath,
  required,
  context,
  rootRef,
  fallbackName,
  inliningTrail = []
}: CsValueArgs) => {
  const modifiers: Modifiers = {
    required,
    nullable: 'nullable' in schema ? schema.nullable : undefined
  }

  const generatorKey = toGeneratorOnlyKey({ generatorId: denoJson.name })

  return match(schema satisfies SchemaType)
    .with({ type: 'custom' }, custom => custom)
    .with({ type: 'ref' }, ref => {
      return new CsRef({
        context,
        destinationPath,
        refName: toRefName(ref.$ref),
        modifiers,
        rootRef,
        schema: ref,
        inliningTrail
      })
    })
    .with({ type: 'array' }, arraySchema => {
      return new CsArray({
        context,
        destinationPath,
        modifiers,
        items: arraySchema.items,
        generatorKey,
        rootRef,
        schema: arraySchema,
        fallbackName,
        inliningTrail
      })
    })
    .with({ type: 'object' }, objectSchema => {
      return new CsObjectValue({
        context,
        destinationPath,
        value: objectSchema,
        modifiers,
        generatorKey,
        rootRef,
        fallbackName,
        inliningTrail
      })
    })
    .with({ type: 'union' }, unionSchema => {
      return new CsUnion({
        context,
        destinationPath,
        modifiers,
        generatorKey,
        schema: unionSchema
      })
    })
    .with({ type: 'number' }, numberSchema => {
      return new CsNumber({ context, modifiers, generatorKey, schema: numberSchema })
    })
    .with({ type: 'integer' }, integerSchema => {
      return new CsInteger({ context, modifiers, generatorKey, schema: integerSchema })
    })
    .with({ type: 'boolean' }, booleanSchema => {
      return new CsBoolean({ context, modifiers, generatorKey, schema: booleanSchema })
    })
    .with({ type: 'void' }, () => new CsVoid({ context, generatorKey }))
    .with({ type: 'string' }, stringSchema => {
      return new CsString({
        context,
        stringSchema,
        modifiers,
        generatorKey,
        destinationPath,
        fallbackName
      })
    })
    .with({ type: 'unknown' }, unknownSchema => {
      return new CsUnknown({
        context,
        generatorKey,
        destinationPath,
        modifiers,
        schema: unknownSchema
      })
    })
    .exhaustive()
}
