import { toGeneratorOnlyKey } from '@skmtc/core'
import type {
  ContentSettings,
  GeneratedValue,
  GenerateContextType,
  RefName,
} from '@skmtc/core'
import { createDataClass } from '@skmtc/lang-kotlin'
import type { KtAnnotation } from '@skmtc/lang-kotlin'
import { toKotlinValue } from './Kotlin.ts'
import { KotlinEnumEntries } from './KotlinEnumEntries.ts'
import { KotlinObjectProperties, KotlinRecord } from './KotlinObject.ts'
import { ensureSealedParent, KotlinSealedInterface } from './KotlinSealedInterface.ts'
import { KotlinJacksonBase } from './base.ts'
import { isDataClassSchema, isEnumClassSchema, isSealedUnion } from './shape.ts'
import { toSealedMembership } from './sealedMembership.ts'
import type { EnrichmentSchema } from './enrichments.ts'

type ConstructorArgs = {
  context: GenerateContextType
  destinationPath: string
  refName: RefName
  settings: ContentSettings<EnrichmentSchema>
  rootRef?: RefName
}

export class KotlinProjection extends KotlinJacksonBase {
  value: GeneratedValue
  /**
   * Class-level annotations, read off the definition's value via the
   * `KtAnnotated` protocol. The Driver wraps THIS PROJECTION as the
   * definition's value, so the sealed branch mirrors its value's
   * annotations here by REFERENCE — one array, two names.
   */
  annotations: KtAnnotation[] = []
  /** The `KtDocumented` protocol input, mirrored the same way. */
  description: string | undefined

  constructor(
    { context, refName, settings, destinationPath, rootRef }: ConstructorArgs,
  ) {
    super({ context, refName, settings })

    const schema = context.resolveSchemaRefOnce(refName, KotlinJacksonBase.id)

    const generatorKey = toGeneratorOnlyKey({
      generatorId: KotlinJacksonBase.id,
    })

    // The KtDocumented mirror covers EVERY branch — a description on an
    // object, enum, union or typealias model all render as class-level
    // KDoc (the Driver wraps this projection as the definition's value,
    // so the protocol reads off it).
    this.description = 'description' in schema ? schema.description : undefined

    // The declaration kinds branch on the SAME guards `toIdentifierType`
    // used to pick the head (shape.ts), so the head and the value it is
    // glued to cannot disagree. Their values render everything after the
    // head — a parameter list, an entry body — which is why they are built
    // here rather than in the router: only a top-level model has a name to
    // declare.
    if (isDataClassSchema(schema)) {
      // The sealed inversion: OpenAPI points parent → member; Kotlin
      // declares member → parent. The claims come from the document-wide
      // scan (computed before ANY construction — memoization makes build
      // order arbitrary); the parent's display name comes through the
      // sanctioned identity door, not a naming-policy copy.
      const claims = toSealedMembership(context).get(refName) ?? []

      // A component parent's display name comes through the sanctioned
      // identity door. A synthesized parent (an INLINE union) is
      // ENSURED into existence here — nothing guarantees any other walk
      // reaches an operation-position union, and a ` : Parent` clause
      // over an undeclared parent must be impossible by construction.
      const supertypes = claims.map((claim) =>
        claim.parent.type === 'component'
          ? context.toModelContentSettings({
            refName: claim.parent.refName,
            projection: KotlinProjection,
            variant: 'main',
          }).identifier.name
          : ensureSealedParent(context, {
            generatorKey,
            unionSchema: claim.parent.union,
            rootRef,
          })
      )

      this.value = new KotlinObjectProperties({
        context,
        generatorKey,
        destinationPath,
        properties: schema.properties ?? {},
        required: schema.required,
        rootRef,
        supertypes,
        // The @JsonTypeInfo class discriminator carries the tag on the
        // wire — a declared property would collide with it, so members
        // omit each claiming parent's discriminator property. The
        // qualifying predicate guarantees at least one parameter survives.
        //
        // OPEN (stage 3): survival is checked PER union (shape.ts
        // `isSealedUnion`) while this omits the UNION of every claim's
        // discriminator, so a member of two unions with different
        // discriminator properties can lose them all and render an empty
        // `data class` — illegal Kotlin, emitted without an error.
        // Predates inline unions; they make multi-parenting common
        // enough to matter. The fix is either checking survival against
        // the full claim set or keeping the property with
        // `@JsonTypeInfo(visible = true)` — a stage-3 decision.
        omittedProperties: new Set(
          claims.map((claim) => claim.discriminatorPropertyName),
        ),
        // A named MIXED model (properties + additionalProperties) keeps
        // both channels: the record becomes the catch-all parameter.
        additionalPropertiesRecord: schema.additionalProperties
          ? new KotlinRecord({
            context,
            generatorKey,
            destinationPath,
            schema: schema.additionalProperties,
            rootRef,
            mutable: true,
          })
          : undefined,
      })
    } else if (isEnumClassSchema(schema)) {
      this.value = new KotlinEnumEntries({
        context,
        destinationPath,
        stringSchema: schema,
        generatorKey,
      })
    } else if (isSealedUnion(context, schema)) {
      const value = new KotlinSealedInterface({
        context,
        generatorKey,
        destinationPath,
        unionSchema: schema,
        rootRef,
      })

      this.value = value
      this.annotations = value.annotations
    } else {
      // Everything else is a `typealias` over a plain type expression.
      this.value = toKotlinValue({
        schema,
        required: true,
        destinationPath,
        context,
        rootRef,
      })
    }

    // SLOT(recursion-annotation): deliberately empty. `context.modelDepth`
    // still tracks cycles (KotlinRef bumps it, and `> 1` here would mean
    // this model's value contains a back-reference to itself), but Kotlin
    // needs no annotation to break one: a class may name itself inside its
    // own body, so `Category.children: List<Category>?` compiles as
    // written. The TypeScript skeleton needs this slot only because
    // `export const` dies of circular inference (TS7022/7024).
  }

  // These two statics make the projection consumable by PEER generators
  // via insertNormalizedModel — keep them. CAVEAT: that door is only
  // sound for `$ref` schemas. For an INLINE object, core's generic glue
  // joins the identifier head to the value's type-position render —
  // invalid Kotlin reported as success (the head+value gap; see the
  // parked core PR #105). Peers pass inline schemas through the
  // exported `toKotlinValue` router instead, which synthesizes named
  // declarations.
  static schemaToValueFn = (...args: Parameters<typeof toKotlinValue>) => {
    return toKotlinValue(...args)
  }

  static createIdentifier = createDataClass

  override toString(): string {
    return `${this.value}`
  }
}
