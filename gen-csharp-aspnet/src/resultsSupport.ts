import type { GenerateContextType } from '@skmtc/core'
import { createClass, defineAndRegister, CsSnippet } from '@skmtc/lang-csharp'
import { join } from '@std/path'
import { getBaseNamespace } from './baseNamespace.ts'

/**
 * The body of the generated `GeneratedResults` helper class — the home
 * of the one sequencing helper the expression-bodied delegation grammar
 * cannot express inline: a 204 action must AWAIT the seam task and THEN
 * return `NoContentResult`, which is a statement sequence. Block bodies
 * live in hand-shaped snippet values (the spec rule), so the helper is
 * generated once and actions call
 * `await GeneratedResults.NoContent(service.X(…))`.
 *
 * Complete output, no stubs (the no-stubs philosophy); emitted on
 * first use only (the Kotlin `ApiError` ensure-support pattern).
 */
export class GeneratedResultsValue extends CsSnippet {
  description = 'Sequencing helpers the generated expression-bodied actions delegate to.'

  constructor({
    context,
    destinationPath
  }: {
    context: GenerateContextType
    destinationPath: string
  }) {
    super({ context })

    this.register({
      imports: {
        'Microsoft.AspNetCore.Mvc': ['IActionResult', 'NoContentResult'],
        'System.Threading.Tasks': ['Task']
      },
      destinationPath
    })
  }

  override toString(): string {
    return [
      '    public static async Task<IActionResult> NoContent(Task task)',
      '    {',
      '        await task;',
      '        return new NoContentResult();',
      '    }'
    ].join('\n')
  }
}

/** The helper file's export path — `@/<namespace dirs>/GeneratedResults.generated.cs`. */
export const toGeneratedResultsExportPath = (): string => {
  return join('@', ...getBaseNamespace().split('.'), 'GeneratedResults.generated.cs')
}

/**
 * Ensure the `GeneratedResults` helper exists — `findDefinition` +
 * `defineAndRegister`, wrong-type hits throw (note-30 lesson 4).
 * Returns the class name for call sites.
 */
export const ensureGeneratedResults = (context: GenerateContextType): string => {
  const name = 'GeneratedResults'
  const exportPath = toGeneratedResultsExportPath()

  const existing = context.findDefinition({ name, exportPath })

  if (existing && !(existing.value instanceof GeneratedResultsValue)) {
    throw new Error(
      `@skmtc/gen-csharp-aspnet: found a definition named '${name}' at '${exportPath}' that ` +
        `is not the generated results helper — name collision, or two copies of the ` +
        `generator module are loaded`
    )
  }

  if (!existing) {
    defineAndRegister(context, {
      identifier: createClass(name),
      value: new GeneratedResultsValue({ context, destinationPath: exportPath }),
      destinationPath: exportPath
    })
  }

  return name
}
