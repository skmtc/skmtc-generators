import { KtAnnotation, KtSnippet } from '@skmtc/lang-kotlin'
import type { GenerateContextType, OasUnion } from '@skmtc/core'

type KtSealedInterfaceValueArgs = {
  context: GenerateContextType
  unionSchema: OasUnion
  destinationPath: string
}

/**
 * The (empty) body of a generated `sealed interface` plus its class-level
 * annotations — `KtDefinition`'s bodyless sealed-interface shell renders
 * the bare declaration when this value is the empty string.
 *
 * Carries the polymorphic serialization wiring via the `KtAnnotated`
 * protocol: `@OptIn(ExperimentalSerializationApi::class)` (required by
 * `@JsonClassDiscriminator`), `@Serializable`, and
 * `@JsonClassDiscriminator("<discriminator.propertyName>")` — scratch-
 * proved against kotlinx 1.9 (spec 22 § Scratch evidence: closed
 * polymorphism is automatic for sealed interfaces; no SerializersModule).
 *
 * The third member of the serialization seam alongside `KtDataClassValue`
 * and `KtEnumEntries`: a Jackson sibling generator replaces the
 * annotation construction in these three files only.
 */
export class KtSealedInterfaceValue extends KtSnippet {
  annotations: KtAnnotation[]

  constructor({ context, unionSchema, destinationPath }: KtSealedInterfaceValueArgs) {
    super({ context, stackTrail: unionSchema.stackTrail.clone() })

    const propertyName = unionSchema.discriminator?.propertyName

    if (!propertyName) {
      throw new Error(
        `@skmtc/gen-kotlin: a sealed interface value requires a discriminated union — ` +
          `KtSealedInterfaceValue is only reachable through the toKtProjection dispatch`
      )
    }

    this.annotations = [
      new KtAnnotation('OptIn', ['ExperimentalSerializationApi::class']),
      new KtAnnotation('Serializable'),
      new KtAnnotation('JsonClassDiscriminator', [`"${propertyName}"`])
    ]

    this.register({
      imports: {
        'kotlinx.serialization': ['ExperimentalSerializationApi', 'Serializable'],
        'kotlinx.serialization.json': ['JsonClassDiscriminator']
      },
      destinationPath
    })
  }

  override toString(): string {
    return ''
  }
}
