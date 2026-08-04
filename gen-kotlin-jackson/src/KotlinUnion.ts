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
import { BASE_PACKAGE, JACKSON_DATABIND_PACKAGE, toModelExportPath } from './lib.ts'
import { isSealedUnion } from './shape.ts'
import { ensureSealedParent } from './KotlinSealedInterface.ts'

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
  /** The synthesized sealed parent's name, when the union qualified. */
  private reference: string | null = null

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

    this.discriminator = discriminator?.propertyName
    this.modifiers = modifiers

    if (schema !== undefined && !schema.isRef() && isSealedUnion(context, schema)) {
      // An INLINE qualifying union: the sealed parent is declared by
      // whoever needs it first (this render site or a member's ` : `
      // clause — see ensureSealedParent for placement and the race);
      // type position renders its NAME through a registered import.
      const name = ensureSealedParent(context, {
        generatorKey,
        unionSchema: schema,
        rootRef,
      })

      // The TypeSystem contract walk, against the SEALED file so cache
      // hits keep member imports where they belong (same package as the
      // members — suppressed at render).
      this.members = members.map((member) =>
        toKotlinValue({
          destinationPath: toModelExportPath(name),
          schema: member,
          required: true,
          context,
          rootRef,
        })
      )

      this.register({
        imports: { [BASE_PACKAGE]: [name] },
        destinationPath,
      })

      this.reference = name

      return
    }

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

    this.register({
      imports: { [JACKSON_DATABIND_PACKAGE]: ['JsonNode'] },
      destinationPath,
    })
  }

  override toString(): string {
    // SLOT(union): Kotlin has no anonymous union type. A QUALIFYING
    // union becomes a named `sealed interface`: top-level via the shape
    // dispatch (the projection's branch), inline via the synthesis above
    // — either way type position holds a NAME. What remains is a
    // non-qualifying union — undiscriminated or heterogeneous — whose
    // honest wire type is Jackson's `JsonNode`: deliberately bound, and
    // an API rather than an `Any` cast.
    return applyModifiers(this.reference ?? 'JsonNode', this.modifiers)
  }
}
