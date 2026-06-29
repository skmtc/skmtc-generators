/**
 * One element of a GraphQL selection set, returned by `toSelection`.
 *
 * Three concrete shapes:
 *   - {@link ScalarSelection} — a leaf (the parent emits just the field name)
 *   - {@link ObjectSelection} — a sub-selection with `{ ... }` children
 *   - {@link EmptySelection}  — sentinel meaning "skip this field"
 *
 * Discriminated by behavior rather than a `kind` tag: the parent uses
 * `isEmpty` to decide whether to include a child at all, and `withName`
 * to render it once included. Scalars and objects implement those two
 * methods differently — that's the whole protocol.
 */
export abstract class Selection {
  /**
   * True when this selection contributes nothing — the parent must
   * skip the field rather than emit a bare name (which would be a
   * GraphQL validation error for object/union fields, and meaningless
   * elsewhere).
   */
  abstract get isEmpty(): boolean

  /**
   * Render this selection as the right-hand side of a parent's field
   * entry, given the field name. Scalars return just the name; object
   * selections return `name { ... }`. Empty selections are never
   * passed here — the parent filters them out via {@link isEmpty}.
   */
  abstract withName(name: string): string

  /**
   * Render the selection set body without the leading field name (i.e.
   * `{ ... }` for objects, `''` for scalars/empty). Useful at the
   * document root where the field name and its arg-pass already exist
   * in the surrounding template.
   */
  abstract toString(): string

  /**
   * Render as a top-level selection-set suffix following a field
   * invocation. Object selections produce ` { ... }`; scalar/empty
   * produce nothing. Lets the document template stay agnostic about
   * whether the root field has subfields.
   */
  asDocumentSuffix(): string {
    return ''
  }
}

/** Field with no sub-selection (scalar / enum / unknown / void / custom). */
export class ScalarSelection extends Selection {
  override get isEmpty(): boolean {
    return false
  }
  override withName(name: string): string {
    return name
  }
  override toString(): string {
    return ''
  }
}

/** Sentinel meaning "drop this field from the parent's selection set". */
export class EmptySelection extends Selection {
  override get isEmpty(): boolean {
    return true
  }
  override withName(_name: string): string {
    return ''
  }
  override toString(): string {
    return ''
  }
}
