import { ModelDriver, toModelGeneratorKey } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'
import type { GenerateContextType, Modifiers, OasRef, OasSchema, RefName } from '@skmtc/core'
import { Wrap } from './Maybe.ts'
import { ZodModifiers } from './ZodModifiers.ts'
import { ZodProjection } from './ZodProjection.ts'
import { zodEntry } from './mod.ts'
type ConstructorProps = {
  context: GenerateContextType
  destinationPath: string
  modifiers: Modifiers
  refName: RefName
  rootRef?: RefName
  /** The originating ref schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
}

export class ZodRef extends TsSnippet {
  type = 'ref' as const
  modifiers: Modifiers
  name: string
  terminal: boolean
  content: Wrap

  constructor({ context, refName, destinationPath, modifiers, rootRef, schema }: ConstructorProps) {
    super({
      context,
      generatorKey: toModelGeneratorKey({
        generatorId: zodEntry.id,
        refName,
        variant: 'main'
      }),
      stackTrail: schema?.stackTrail.clone()
    })

    this.modifiers = modifiers
    const modifierCalls = new ZodModifiers(modifiers)

    if (context.modelDepth[`${zodEntry.id}:${refName}`] > 0) {
      // A back-reference to a model still open on the build stack: this is a
      // recursive cycle, rendered as `z.lazy(() => …)`. Bump the depth
      // so the enclosing `ZodProjection` — whose own `resolveSchemaRefOnce`
      // set this key to 1 — can detect recursion as `> 1` and annotate the
      // export with `z.ZodType<…>` to break TS's circular inference.
      // `ModelDriver` resets the key to 0 after the model finishes building.
      context.modelDepth[`${zodEntry.id}:${refName}`]++

      const settings = context.toModelContentSettings({
        refName,
        projection: ZodProjection,
        variant: 'main'
      })

      this.register({
        imports: { zod: ['z'] },
        destinationPath: settings.exportPath
      })

      this.name = settings.identifier.name
      this.terminal = true
      this.content = new Wrap(['z.lazy(() => ', this.name, modifierCalls, ')'])
    } else {
      const { settings } = new ModelDriver({
        context,
        refName,
        destinationPath,
        rootRef,
        projection: ZodProjection,
        variant: 'main'
      })

      this.name = settings.identifier.name
      this.terminal = false
      this.content = new Wrap([this.name, modifierCalls])
    }
  }

  override toString(): string {
    return `${this.content}`
  }
}
