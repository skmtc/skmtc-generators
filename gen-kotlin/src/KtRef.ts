import { ModelDriver, toModelGeneratorKey } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import type { GenerateContextType, Modifiers, OasRef, OasSchema, RefName } from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'
import { toKtProjectionForRef } from './toKtProjection.ts'
import denoJson from '../deno.json' with { type: 'json' }

type KtRefArgs = {
  context: GenerateContextType
  destinationPath: string
  modifiers: Modifiers
  refName: RefName
  rootRef?: RefName
  /** The originating ref schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
}

/**
 * A `$ref` → the referenced model's identifier name, inserting the peer
 * through the SAME shape dispatch the transform uses
 * (`toKtProjectionForRef` — one shared function, so a refName always
 * resolves to the same projection class wherever it is reached from).
 *
 * Mirrors gen-typescript's `TsRef`, including the recursion guard: a
 * self-reference mid-construction (`context.modelDepth > 0`) renders the
 * name without re-entering the Driver. The Driver-registered cross-file
 * import is suppressed by `KtFile` when peers share the package — in v1
 * all models share one package, so peer references render bare.
 */
export class KtRef extends KtSnippet {
  type = 'ref' as const
  name: string
  modifiers: Modifiers
  terminal: boolean

  constructor({ context, refName, modifiers, destinationPath, rootRef, schema }: KtRefArgs) {
    super({
      context,
      generatorKey: toModelGeneratorKey({
        generatorId: denoJson.name,
        refName,
        variant: 'main'
      }),
      stackTrail: schema?.stackTrail.clone()
    })

    const projection = toKtProjectionForRef(context, refName)

    if (context.modelDepth[`${denoJson.name}:${refName}`] > 0) {
      const settings = context.toModelContentSettings({
        refName,
        projection,
        variant: 'main'
      })

      this.name = settings.identifier.name
      this.modifiers = modifiers
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
      this.modifiers = modifiers
      this.terminal = false
    }
  }

  override toString(): string {
    return applyModifiers(this.name, this.modifiers)
  }
}
