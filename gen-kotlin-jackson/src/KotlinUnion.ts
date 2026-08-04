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
import { JACKSON_DATABIND_PACKAGE, toModelExportPath } from './lib.ts'
import { isSealedUnion } from './shape.ts'
import { ensureSealedParent } from './KotlinSealedInterface.ts'
import { toSynthesizedNameOrNull } from './toSynthesizedName.ts'

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

    // An INLINE qualifying union: the sealed parent is declared by
    // whoever needs it first (this render site or a member's ` : `
    // clause — see ensureSealedParent for placement and the race);
    // type position renders its NAME through a registered import. The
    // derivability probe is the SAME one the membership scan used to
    // claim (or skip) the members — an underivable position falls back
    // to `JsonNode` here AND renders no clause there, consistently.
    const reference = schema !== undefined && !schema.isRef() &&
        isSealedUnion(context, schema) &&
        toSynthesizedNameOrNull(context, schema.stackTrail) !== null
      ? ensureSealedParent(context, { generatorKey, unionSchema: schema, rootRef })
      : null

    // The TypeSystem contract walk. When the union qualified,
    // `KotlinSealedInterface` has ALREADY walked these members against
    // the sealed file on `'declare'` — this walk is cache hits, and it
    // targets the same file so member imports stay where they belong.
    const memberPath = reference !== null ? toModelExportPath(reference) : destinationPath

    this.members = members.map((member) =>
      toKotlinValue({
        destinationPath: memberPath,
        schema: member,
        required: true,
        context,
        rootRef,
      })
    )

    this.register({
      imports: reference !== null
        // The `@/`-export-path import key — the project-file form
        // KtImport resolves through the path policy; same-package
        // suppression drops it where redundant.
        ? { [memberPath]: [reference] }
        : { [JACKSON_DATABIND_PACKAGE]: ['JsonNode'] },
      destinationPath,
    })

    this.reference = reference
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
