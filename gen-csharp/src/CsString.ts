import { createEnum, defineAndRegister, CsSnippet } from '@skmtc/lang-csharp'
import type { GenerateContextType, GeneratorKey, Modifiers, OasString } from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'
import { getCustomScalar, logUnknownFormatOnce } from './scalars.ts'
import { toCsModelExportPath } from './base.ts'
import { CsEnumMembers } from './CsEnumMembers.ts'
import { toEnumValues } from './toEnumValues.ts'

type CsStringArgs = {
  context: GenerateContextType
  stringSchema: OasString
  modifiers: Modifiers
  generatorKey: GeneratorKey
  destinationPath: string
  /** Name for a synthesized enum when the schema carries enums. */
  fallbackName: string
}

/**
 * String schema → C# type. Plain strings map through the scalar map —
 * RICH defaults (D12): `uuid` → `Guid`, `date-time` → `DateTimeOffset`,
 * `date` → `DateOnly`, `time` → `TimeOnly`, `binary`/`byte` → `byte[]`.
 * A DOTTED scalar (`System.Guid`) renders its simple name and registers
 * the namespace using; an unrecognized format maps to `string` and logs
 * once per format.
 *
 * A string with enums synthesizes a named `enum` (C# has no
 * anonymous/inline enums) in its own canonical file —
 * `toCsModelExportPath(fallbackName)`, one type per file, deduped
 * GLOBALLY by `findDefinition` at that path so the same construct
 * reached from several files synthesizes once — and references it by
 * name (bare under same-namespace suppression). A `findDefinition` hit
 * with the wrong value type THROWS (note-30 lesson 4 — name collision
 * or dual-copy diagnosis, never a silent fall-through).
 */
export class CsString extends CsSnippet {
  type = 'string' as const
  format: string | undefined
  enums: string[] | (string | null)[] | undefined
  modifiers: Modifiers
  private reference: string

  constructor({
    context,
    stringSchema,
    modifiers,
    generatorKey,
    destinationPath,
    fallbackName
  }: CsStringArgs) {
    super({ context, generatorKey, stackTrail: stringSchema.stackTrail.clone() })

    this.format = stringSchema.format
    this.enums = stringSchema.enums
    this.modifiers = modifiers

    const values = toEnumValues(stringSchema.enums)

    if (values.length > 0) {
      const exportPath = toCsModelExportPath(fallbackName)
      const existing = context.findDefinition({ name: fallbackName, exportPath })

      if (existing && !(existing.value instanceof CsEnumMembers)) {
        throw new Error(
          `@skmtc/gen-csharp: found a definition named '${fallbackName}' at '${exportPath}' ` +
            `that is not a synthesized enum — name collision, or two copies of the generator ` +
            `module are loaded`
        )
      }

      if (!existing) {
        defineAndRegister(context, {
          identifier: createEnum(fallbackName),
          value: new CsEnumMembers({
            context,
            values,
            typeName: fallbackName,
            destinationPath: exportPath,
            stackTrail: stringSchema.stackTrail.clone()
          }),
          destinationPath: exportPath
        })
      }

      this.register({
        imports: { [exportPath]: [fallbackName] },
        destinationPath
      })

      this.reference = fallbackName
    } else {
      const scalar = getCustomScalar(this.format)

      if (this.format !== undefined && scalar === undefined) {
        logUnknownFormatOnce(this.format)
      }

      const resolved = scalar ?? 'string'

      // A dotted scalar (`System.Guid`) renders its simple name with the
      // namespace using registered — the scalars option wires imports
      // itself (the gen-kotlin 0.0.9 mechanism, namespace-level).
      const lastDot = resolved.lastIndexOf('.')

      if (lastDot > 0) {
        const module = resolved.slice(0, lastDot)
        const name = resolved.slice(lastDot + 1)

        this.register({ imports: { [module]: [name] }, destinationPath })
        this.reference = name
      } else {
        this.reference = resolved
      }
    }
  }

  override toString(): string {
    return applyModifiers(this.reference, this.modifiers)
  }
}
