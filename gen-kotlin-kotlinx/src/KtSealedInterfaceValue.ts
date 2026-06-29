import { KtAnnotation, KtSnippet } from '@skmtc/lang-kotlin'
import type { GenerateContextType, OasUnion } from '@skmtc/core'
import { getUnionHint } from './unionHints.ts'
import { toKDocText } from './kdocText.ts'

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
  description: string | undefined

  constructor({ context, unionSchema, destinationPath }: KtSealedInterfaceValueArgs) {
    super({ context, stackTrail: unionSchema.stackTrail.clone() })

    this.description = toKDocText(unionSchema.description)

    // A real discriminator, else the consumer-asserted hint (spec 26).
    const propertyName =
      unionSchema.discriminator?.propertyName ??
      getUnionHint(context, unionSchema)?.propertyName

    if (!propertyName) {
      throw new Error(
        `@skmtc/gen-kotlin-kotlinx: a sealed interface value requires a discriminated (or hinted) ` +
          `union — KtSealedInterfaceValue is only reachable through the toKtProjection dispatch`
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
