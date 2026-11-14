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
import { TsSnippet } from '@skmtc/lang-typescript'
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
  additionalProperties: ArktypeValue | undefined
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

    // Set for the core `TypeSystemObject` contract; this generator composes
    // through `properties` / `additionalProperties` instead.
    this.recordProperties = null
    this.objectProperties = null
  }

  override toString(): string {
    const entries = Object.entries(this.properties).map(([key, value]) => {
      const name = this.required.includes(key) ? key : `${key}?`
      // Quoted unless the whole key is a bare identifier — `age?` and
      // `user-name` both need quotes.
      const needsQuotes = /[^a-zA-Z0-9_$]/.test(name) || /^\d/.test(name)

      return `${needsQuotes ? `"${name}"` : name}: ${value}`
    })

    if (this.additionalProperties) {
      // An index signature, which composes inside the same literal — unlike
      // `Record<…>`, which only exists in string syntax and so cannot hold an
      // object or a ref.
      entries.push(`"[string]": ${this.additionalProperties}`)
    }

    const literal = entries.length ? `{ ${entries.join(', ')} }` : '{}'

    return applyValueModifiers(literal, this.modifiers)
  }
}
