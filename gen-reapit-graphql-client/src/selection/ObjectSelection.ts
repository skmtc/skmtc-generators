import { isCustomValue, type OasObject } from '@skmtc/core'
import { Selection, ScalarSelection } from './Selection.ts'
import { toSelection } from './toSelection.ts'

type ObjectSelectionArgs = {
  schema: OasObject
  visited: Set<string>
  depth: number
  maxDepth: number
}

/**
 * Sub-selection over an object's properties. Constructed once when
 * `toSelection` runs; recursion into property schemas happens here, not
 * in `toString`. Empty children (cycles, depth-exhausted, multi-member
 * unions) are kept in the entry list and filtered out at render time
 * — this preserves source order without losing the entry, which makes
 * future enrichment-driven overrides easier to slot in.
 */
export class ObjectSelection extends Selection {
  private readonly entries: Array<[string, Selection]>

  constructor({ schema, visited, depth, maxDepth }: ObjectSelectionArgs) {
    super()

    const properties = schema.properties ?? {}
    this.entries = Object.entries(properties).map(([name, propSchema]) => {
      // CustomValue is a separate branch — it doesn't share the OAS
      // schema discriminator, so handle it before the switch.
      if (isCustomValue(propSchema)) {
        return [name, new ScalarSelection()] as [string, Selection]
      }
      return [
        name,
        toSelection({ schema: propSchema, visited, depth: depth + 1, maxDepth })
      ]
    })
  }

  override get isEmpty(): boolean {
    return this.entries.every(([, sel]) => sel.isEmpty)
  }

  override withName(name: string): string {
    return `${name} ${this.toString()}`
  }

  override toString(): string {
    const rendered: string[] = []
    for (const [name, sel] of this.entries) {
      if (sel.isEmpty) continue
      rendered.push(sel.withName(name))
    }
    return `{ ${rendered.join(' ')} }`
  }

  override asDocumentSuffix(): string {
    return this.isEmpty ? '' : ` ${this.toString()}`
  }
}
