import { toRefName } from '@skmtc/core'
import type {
  GenerateContextType,
  GeneratorKey,
  OasRef,
  OasSchema,
  Stringable
} from '@skmtc/core'
import { KtSnippet, defineAndRegister } from '@skmtc/lang-kotlin'
import { KotlinProjection, toKotlinValue } from '@skmtc/gen-kotlin-jackson'

type ModelReferenceArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey
  /** The file that will NAME the model — this controller's own path. */
  destinationPath: string
  schema: OasSchema | OasRef<'schema'>
  /** Identifier-derived name used when the schema is unnamed (inline). */
  fallbackName: string
}

/**
 * The operation law, in one class: every schema that appears in a
 * controller's signature is a REFERENCE to a definition owned by the
 * model generator. Nothing here renders a schema — only a name lands in
 * this generator's tree.
 *
 * Two branches, because a named and an unnamed schema reach the peer by
 * different routes:
 *
 * - a `$ref` → the peer's own ref snippet. It probes the cache, builds
 *   the model at the peer's export path on a miss, and the Driver
 *   stitches the cross-file import into `destinationPath`.
 * - an INLINE schema → normalized into a one-off model named from this
 *   operation's identifier, built from the peer's value and its
 *   identifier factory, and placed at the path the peer's own identity
 *   statics choose. Those statics are pure and pre-construction — the
 *   same ones the engine calls — so the models package stays THEIR fact
 *   and is never restated here.
 */
export class ModelReference extends KtSnippet {
  value: Stringable

  constructor(
    { context, generatorKey, destinationPath, schema, fallbackName }: ModelReferenceArgs
  ) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() })

    if (schema.isRef()) {
      this.value = toKotlinValue({ context, schema, destinationPath, required: true })

      return
    }

    // A synthetic ref name: the peer's identity statics are keyed by one.
    const refName = toRefName(`#/components/schemas/${fallbackName}`)
    const enrichments = KotlinProjection.toEnrichments({ refName, context, variant: 'main' })
    const identityArgs = { refName, enrichments, variant: 'main' }

    const modelPath = KotlinProjection.toExportPath(identityArgs)
    const modelName = KotlinProjection.toIdentifierName(identityArgs)

    const definition =
      context.findDefinition({ name: modelName, exportPath: modelPath }) ??
      defineAndRegister(context, {
        identifier: KotlinProjection.createIdentifier(modelName),
        value: toDeclarationValue(
          // `destinationPath` is the MODEL's file, so any `$ref` nested in
          // the inline schema registers its import there — not here.
          KotlinProjection.schemaToValueFn({
            context,
            schema,
            destinationPath: modelPath,
            required: true
          })
        ),
        destinationPath: modelPath
      })

    this.value = definition.identifier.name

    this.register({ destinationPath, imports: { [modelPath]: [definition.identifier.name] } })
  }

  override toString(): string {
    return `${this.value}`
  }
}

/** A value that carries a declaration-position form alongside its type-position one. */
type WithObjectProperties = { objectProperties: Stringable | null }

const hasObjectProperties = (value: unknown): value is WithObjectProperties => {
  return typeof value === 'object' && value !== null && 'objectProperties' in value
}

/**
 * The peer's router answers in TYPE position: an inline object has no
 * anonymous Kotlin class literal, so it widens to `Map<String, Any?>`.
 * Glued after a `data class Name` head that is nonsense — what a
 * declaration needs is the same object's primary-constructor property
 * list, which the peer builds either way and hangs off the object value.
 * Presence-tested, not type-tested: the peer exposes the shape, not the
 * class.
 *
 * Anything else (a scalar, an array, a union) is already a valid
 * right-hand side and passes through untouched.
 */
const toDeclarationValue = (value: Stringable): Stringable => {
  if (hasObjectProperties(value) && value.objectProperties) {
    return value.objectProperties
  }

  return value
}
