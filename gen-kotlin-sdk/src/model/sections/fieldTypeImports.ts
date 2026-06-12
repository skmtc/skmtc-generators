import type { RenderContext } from '@/RenderContext.ts'
import type { SdkField, SdkType } from '@/model/SdkModel.ts'

/**
 * The imports a section needs because it PRINTS these fields' type
 * expressions: `java.time` for datetimes, the models package for
 * shared classes. Nested model/enum classes print bare names (same
 * file) and stop the recursion — their own sections register their
 * own needs.
 */
export const toFieldTypeImports = (
  fields: SdkField[],
  context: RenderContext
): Record<string, string[]> => {
  const datetimes = new Set<string>()
  const sharedClassNames = new Set<string>()

  const visit = (type: SdkType): void => {
    switch (type.kind) {
      case 'list':
        visit(type.element)
        return
      case 'datetime':
        datetimes.add(type.date === 'local-date' ? 'LocalDate' : 'OffsetDateTime')
        return
      case 'shared':
        sharedClassNames.add(type.className)
        return
      case 'scalar':
      case 'model':
      case 'enum':
        return
      default: {
        const _exhaustive: never = type
        throw new Error(`Unhandled SdkType: ${JSON.stringify(_exhaustive)}`)
      }
    }
  }

  fields.forEach(field => visit(field.type))

  const imports: Record<string, string[]> = {}

  if (datetimes.size) {
    imports['java.time'] = [...datetimes].sort()
  }

  if (sharedClassNames.size) {
    imports[`${context.basePackage}.models`] = [...sharedClassNames].sort()
  }

  return imports
}
