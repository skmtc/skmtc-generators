import {
  ModelDriver,
  normalizeWorkspacePath,
  toModelGeneratorKey,
} from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'
import { TsProjection } from '@skmtc/gen-typescript'
import type {
  GenerateContextType,
  Modifiers,
  OasRef,
  RefName,
} from '@skmtc/core'
import { applyModifiers } from './modifiers.ts'
import { EffectProjection } from './EffectProjection.ts'
import { effectSchemaEntry } from './mod.ts'
import { LIB, LIB_MODULE } from './lib.ts'
import { needsCoercion } from './coercion.ts'
import { toOptions } from './options.ts'
import { toTypeAlias } from './base.ts'

type EffectRefArgs = {
  context: GenerateContextType
  destinationPath: string
  modifiers: Modifiers
  refName: RefName
  rootRef?: RefName
  /** The ref node — attribution, and whether the target needs a twin. */
  schema: OasRef<'schema'>
  /** Query-string mode, as the enclosing parameter object passes it down. */
  coerce?: boolean
}

/**
 * A $ref. Only the peer's NAME lands in this value tree — the Driver
 * (or the recursion branch) resolves the definition and stitches the
 * cross-file import. Never inline-expand a ref and never hand-write
 * its import.
 *
 * Under `coerce` (a path or query parameter) a target with a number,
 * boolean or array in it is asked for as its `FromString` twin,
 * `{ options: { coerce: true } }` — `limit?: PageSize` would refuse every
 * `?limit=50`. A target of strings reads the same either way, so the ref
 * lands on the JSON reading; `needsCoercion` answers the same for every
 * reader, which keeps one spelling per definition.
 */
export class EffectRef extends TsSnippet {
  type = 'ref' as const
  modifiers: Modifiers
  name: string
  /**
   * Set only on a recursive back-reference: gen-typescript's type, under
   * an alias, annotating the `Schema.suspend` callback so the enclosing
   * `export const` escapes circular inference.
   */
  typeName: string | null

  constructor(
    {
      context,
      refName,
      destinationPath,
      modifiers,
      rootRef,
      schema,
      coerce = false,
    }: EffectRefArgs,
  ) {
    super({
      context,
      generatorKey: toModelGeneratorKey({
        generatorId: effectSchemaEntry.id,
        refName,
        variant: 'main',
      }),
      stackTrail: schema.stackTrail.clone(),
    })

    this.modifiers = modifiers

    const coerced = coerce && needsCoercion(schema)

    if (context.modelDepth[`${effectSchemaEntry.id}:${refName}`] > 0) {
      // A twin's arrays are readonly (`mutable` refuses `ArrayEnsure`), so
      // no annotation on its suspend holds against the model's type.
      if (coerced) {
        throw new Error(
          `${refName} is recursive and referenced from a path or query parameter, which its FromString twin cannot express — inline the parameter's schema instead`,
        )
      }

      // A back-reference to a model still open on the build stack: a
      // recursive cycle, rendered below as `Schema.suspend`. Never coerced —
      // that case threw above — so it is the JSON reading it names.
      const settings = context.toModelContentSettings({
        refName,
        projection: EffectProjection,
        variant: 'main',
      })

      // Identity only, before anything is inserted: a clone that points both
      // generators at one folder would put the type in the schema's own
      // file, and the engine's report of that names neither.
      const tsSettings = context.toModelContentSettings({
        refName,
        projection: TsProjection,
        variant: 'main',
      })

      // Compared as workspace paths: one spelling on every host.
      if (
        normalizeWorkspacePath(tsSettings.exportPath) ===
          normalizeWorkspacePath(settings.exportPath)
      ) {
        throw new Error(
          `${refName} is recursive, and gen-typescript would write its type into ${settings.exportPath}, the file gen-effect-schema writes its schema to — give the two generators' toExportPath different folders`,
        )
      }

      // Inserted with no destination so the engine stitches no import: the
      // type is imported under its alias (base.ts), and the target's value
      // is imported here when the cycle crosses files, since no Driver
      // runs on this branch.
      const tsType = context.insertModel(TsProjection, refName, {
        variant: 'main',
      })

      const alias = toTypeAlias(settings.identifier.name)

      const sameFile = normalizeWorkspacePath(settings.exportPath) ===
        normalizeWorkspacePath(destinationPath)

      this.register({
        imports: {
          [LIB_MODULE]: [LIB],
          ...(sameFile ? {} : {
            [settings.exportPath]: [settings.identifier.name],
          }),
          [tsSettings.exportPath]: [
            { name: tsType.toName(), alias, type: 'type' },
          ],
        },
        destinationPath,
      })

      this.name = settings.identifier.name
      this.typeName = alias
    } else {
      // The memoization path: probe the cache; hit → reuse (the peer's
      // constructor never runs) + auto-stitched import; miss →
      // construct recursively. The options are part of the probe.
      const { settings } = new ModelDriver({
        context,
        refName,
        destinationPath,
        rootRef,
        projection: EffectProjection,
        variant: 'main',
        options: toOptions(coerced),
      })

      this.name = settings.identifier.name
      this.typeName = null
    }
  }

  override toString(): string {
    const content = this.typeName === null
      ? this.name
      : `${LIB}.suspend((): ${LIB}.Codec<${this.typeName}> => ${this.name})`

    return applyModifiers(content, this.modifiers)
  }
}
