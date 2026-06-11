import { ModelDriver, toModelGeneratorKey } from '@skmtc/core'
import { CsSnippet } from '@skmtc/lang-csharp'
import type {
  GenerateContextType,
  Modifiers,
  OasRef,
  OasSchema,
  RefName,
  Stringable
} from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'
import { toCsModelName } from './base.ts'
import { peekSchema, toCsProjectionForRef } from './toCsProjection.ts'
import { toCsValue } from './Cs.ts'
import denoJson from '../deno.json' with { type: 'json' }

type CsRefArgs = {
  context: GenerateContextType
  destinationPath: string
  modifiers: Modifiers
  refName: RefName
  rootRef?: RefName
  /** The originating ref schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
  /** The refNames currently being inlined — the D6 cycle guard. */
  inliningTrail?: RefName[]
}

/**
 * A `$ref` at the value layer — the D6 fork:
 *
 * - **declarable target** (record / enum per the shared dispatch) → the
 *   referenced model's identifier name, inserting the peer through the
 *   SAME dispatch the transform uses. Mirrors gen-typescript's `TsRef`,
 *   including the recursion guard: a self-reference mid-construction
 *   (`context.modelDepth > 0`) renders the name without re-entering the
 *   Driver. The Driver-registered cross-file using is suppressed by
 *   `CsFile` when peers share the namespace — in v1 all models share
 *   one namespace, so peer references render bare.
 * - **non-declarable target** (primitive / array / map / empty object /
 *   union — no C# declaration form exists) → the target's **inlined
 *   type expression**, built through the shared value dispatch with the
 *   target's name as the synthesis hint (`IReadOnlyList<User>` instead
 *   of a name). Cycle guard: a ref-chain of non-declarables that
 *   revisits a refName without passing through a declarable node is
 *   malformed input → loud per-item error (the run continues; the item
 *   records `error`).
 */
export class CsRef extends CsSnippet {
  type = 'ref' as const
  /** The referenced model's name (declarable) or the target's derived name (inlined — informational; `toString` renders the expression). */
  name: string
  modifiers: Modifiers
  terminal: boolean
  private reference: Stringable

  constructor({
    context,
    refName,
    modifiers,
    destinationPath,
    rootRef,
    schema,
    inliningTrail = []
  }: CsRefArgs) {
    super({
      context,
      generatorKey: toModelGeneratorKey({
        generatorId: denoJson.name,
        refName,
        variant: 'main'
      }),
      stackTrail: schema?.stackTrail.clone()
    })

    this.modifiers = modifiers

    const projection = toCsProjectionForRef(context, refName)

    if (projection) {
      if (context.modelDepth[`${denoJson.name}:${refName}`] > 0) {
        const settings = context.toModelContentSettings({
          refName,
          projection,
          variant: 'main'
        })

        this.name = settings.identifier.name
        this.reference = this.name
        this.terminal = true
      } else {
        const driver = new ModelDriver({
          context,
          refName,
          destinationPath,
          projection,
          rootRef,
          variant: 'main'
        })

        this.name = driver.settings.identifier.name
        this.reference = this.name
        this.terminal = false
      }

      return
    }

    if (inliningTrail.includes(refName)) {
      throw new Error(
        `@skmtc/gen-csharp: '${[...inliningTrail, refName].join(' -> ')}' is a ref cycle of ` +
          `non-declarable schemas — C# has no type alias to break it; make one node an ` +
          `object with properties or restructure the schema`
      )
    }

    this.name = toCsModelName(refName)
    this.reference = toCsValue({
      schema: peekSchema(context, refName),
      destinationPath,
      required: true,
      context,
      rootRef,
      fallbackName: toCsModelName(refName),
      inliningTrail: [...inliningTrail, refName]
    })
    this.terminal = false
  }

  override toString(): string {
    return applyModifiers(`${this.reference}`, this.modifiers)
  }
}
