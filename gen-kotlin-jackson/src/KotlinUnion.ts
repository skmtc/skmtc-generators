import { KtSnippet } from '@skmtc/lang-kotlin'
import type {
  GenerateContextType,
  GeneratorKey,
  Modifiers,
  OasDiscriminator,
  OasRef,
  OasSchema,
  RefName,
  TypeSystemValue,
} from '@skmtc/core'
import { toKotlinValue } from './Kotlin.ts'
import { applyModifiers } from './modifiers.ts'
import { JACKSON_DATABIND_PACKAGE } from './lib.ts'

type KotlinUnionArgs = {
  context: GenerateContextType
  destinationPath: string
  members: (OasSchema | OasRef<'schema'>)[]
  /** The originating union schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
  discriminator?: OasDiscriminator
  modifiers: Modifiers
  generatorKey: GeneratorKey
  rootRef?: RefName
}

export class KotlinUnion extends KtSnippet {
  type = 'union' as const
  members: TypeSystemValue[]
  discriminator: string | undefined
  modifiers: Modifiers

  constructor(
    {
      context,
      generatorKey,
      destinationPath,
      members,
      discriminator,
      modifiers,
      rootRef,
      schema,
    }: KotlinUnionArgs,
  ) {
    super({ context, generatorKey, stackTrail: schema?.stackTrail.clone() })

    // The members are still walked so that every `$ref` inside a union
    // gets its own model generated and cached, even though the union's
    // own type expression cannot name them.
    this.members = members.map((member) =>
      toKotlinValue({
        destinationPath,
        schema: member,
        required: true,
        context,
        rootRef,
      })
    )

    this.discriminator = discriminator?.propertyName
    this.modifiers = modifiers

    this.register({
      imports: { [JACKSON_DATABIND_PACKAGE]: ['JsonNode'] },
      destinationPath,
    })
  }

  override toString(): string {
    // SLOT(union): Kotlin has no anonymous union type. A QUALIFYING
    // top-level union never reaches this class — the shape dispatch
    // routes it to `sealed interface` + `@JsonTypeInfo`/`@JsonSubTypes`
    // (see shape.ts `isSealedUnion` and `KotlinSealedInterface`). What
    // lands here is an inline union (sealed-sibling synthesis is the
    // planned stage 2) or a non-qualifying one — undiscriminated or
    // heterogeneous — whose honest wire type is Jackson's `JsonNode`:
    // deliberately bound, and an API rather than an `Any` cast.
    return applyModifiers('JsonNode', this.modifiers)
  }
}
