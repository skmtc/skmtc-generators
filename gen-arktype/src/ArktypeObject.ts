import {
  type GenerateContextType,
  type Modifiers,
  type GeneratorKey,
  type OasObject,
  type RefName,
  type TypeSystemRecord,
  type TypeSystemObjectProperties,
  isEmpty
} from '@skmtc/core'
import { toAnyStringExceptPattern, toRegExpLiteral, toStringLiteral, TsSnippet } from '@skmtc/lang-typescript'
import { ArktypeUnknown } from './ArktypeUnknown.ts'
import { applyValueModifiers } from './applyModifiers.ts'
import { type ArktypeValue, toArktypeValue } from './Arktype.ts'

type ArktypeObjectArgs = {
  context: GenerateContextType
  objectSchema: OasObject
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
  rootRef?: RefName
}

export class ArktypeObject extends TsSnippet {
  type = 'object' as const
  recordProperties: TypeSystemRecord | null
  objectProperties: TypeSystemObjectProperties | null
  modifiers: Modifiers
  // An object is never spellable in arktype's string syntax — `type("{ a:
  // string }")` fails to parse, because that syntax has no object literals.
  stringSyntax = undefined
  atomicStringSyntax = undefined
  properties: Record<string, ArktypeValue>
  /**
   * Each property's key as arktype reads it (see `toKeySyntax`), before
   * quoting. A key arktype has no spelling for is not in it.
   */
  keySyntax: Record<string, string>
  additionalProperties: ArktypeValue | undefined
  /** The index signature's key, quoted for the object literal. */
  indexKey: string
  required: string[]

  constructor({
    context,
    objectSchema,
    modifiers,
    destinationPath,
    generatorKey,
    rootRef
  }: ArktypeObjectArgs) {
    super({ context, generatorKey, stackTrail: objectSchema.stackTrail.clone() })

    this.modifiers = modifiers
    this.required = objectSchema.required ?? []

    this.properties = Object.fromEntries(
      Object.entries(objectSchema.properties ?? {}).map(([key, property]) => [
        key,
        // Always `required: true` — a property's optionality is carried by the
        // `key?` spelling below, not by the value.
        toArktypeValue({ schema: property, required: true, destinationPath, context, rootRef })
      ])
    )

    // A key arktype cannot spell is left out, and a warning names it:
    // spelled as it is, arktype would read another key and reject every
    // object that has the real one.
    this.keySyntax = Object.fromEntries(
      Object.keys(this.properties).flatMap(key => {
        const optional = !this.required.includes(key)
        const syntax = toKeySyntax({ key, optional })

        if (syntax === undefined) {
          context.logger.warn(
            `arktype has no key for the ${optional ? 'optional' : 'required'} property ${toStringLiteral(key)}, so it is not checked`
          )

          return []
        }

        return [[key, syntax]]
      })
    )

    const { additionalProperties } = objectSchema

    this.additionalProperties = additionalProperties
      ? additionalProperties === true || isEmpty(additionalProperties)
        ? // `additionalProperties: true` means an unconstrained value.
          new ArktypeUnknown({ context, generatorKey, destinationPath })
        : toArktypeValue({
            schema: additionalProperties,
            required: true,
            destinationPath,
            context,
            rootRef
          })
      : undefined

    // `additionalProperties` covers only the keys `properties` does not
    // name, but arktype checks a `[string]` index signature against every
    // key: a typed record beside named keys of other types failed to parse
    // ("Intersection at id of string and number results in an unsatisfiable
    // type", #101). Beside named keys, the key is a pattern that is none of
    // them. An untyped record accepts the named keys' values too, so it
    // keeps `[string]`.
    const namedKeys = this.additionalProperties instanceof ArktypeUnknown ? [] : Object.keys(this.properties)

    // Double quotes, like every other arktype definition string. The trap:
    // arktype reads `\\` inside a definition as one `\` (it keeps `\.` and
    // `\/`), so a key holding a backslash, which the pattern escapes as
    // `\\`, would become `\` and stop matching. Each `\\` is doubled once
    // more for arktype.
    this.indexKey = JSON.stringify(
      namedKeys.length === 0
        ? '[string]'
        : `[${toRegExpLiteral(toAnyStringExceptPattern({ names: namedKeys })).replaceAll('\\\\', '\\\\\\\\')}]`
    )

    // Set for the core `TypeSystemObject` contract; this generator composes
    // through `properties` / `additionalProperties` instead.
    this.recordProperties = null
    this.objectProperties = null
  }

  override toString(): string {
    const entries = Object.entries(this.keySyntax).map(([key, syntax]) => {
      // Quoted unless the whole key is a bare identifier — `age?` and
      // `user-name` both need quotes. JSON.stringify escapes a `"` or `\`.
      const needsQuotes = /[^a-zA-Z0-9_$]/.test(syntax) || /^\d/.test(syntax)

      return `${needsQuotes ? JSON.stringify(syntax) : syntax}: ${this.properties[key]}`
    })

    if (this.additionalProperties) {
      // An index signature, which composes inside the same literal — unlike
      // `Record<…>`, which only exists in string syntax and so cannot hold an
      // object or a ref.
      entries.push(`${this.indexKey}: ${this.additionalProperties}`)
    }

    const literal = entries.length ? `{ ${entries.join(', ')} }` : '{}'

    return applyValueModifiers(literal, this.modifiers)
  }
}

type ToKeySyntaxArgs = {
  key: string
  optional: boolean
}

/**
 * A property key as arktype reads it in an object definition, or
 * `undefined` when arktype has no spelling for it.
 *
 * The trap: arktype gives some keys a meaning of its own. A trailing `?`
 * marks the key optional, `[…]` is an index signature, and `...` and `+`
 * are a spread and the rule for undeclared keys. A `\` makes each one a
 * plain key: `foo\?`, `\[x]`, `\...`, `\+`. That `\` is also why two kinds
 * of key have no spelling: an optional key that ends in `\` (arktype reads
 * `a\?` as the required key `a?`), and a required key that already starts
 * with that `\` (arktype reads `\[x]` as `[x]`).
 */
const toKeySyntax = ({ key, optional }: ToKeySyntaxArgs): string | undefined => {
  if (optional) {
    return key.endsWith('\\') ? undefined : `${key}?`
  }

  if (key.endsWith('?')) {
    return `${key.slice(0, -1)}\\?`
  }

  if ((key.startsWith('[') && key.endsWith(']')) || key === '...' || key === '+') {
    return `\\${key}`
  }

  if ((key.startsWith('\\[') && key.endsWith(']')) || key === '\\...' || key === '\\+') {
    return undefined
  }

  return key
}
