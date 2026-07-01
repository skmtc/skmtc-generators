import { SnippetBase, type GenerateContextType, type OasParameter } from '@skmtc/core'
import { Name } from './Name.ts'
import { Schema, type Definitions } from './Schema.ts'
import { Description } from './Description.ts'
import { Example } from './Example.ts'
import { toExample } from '../toExample.ts'

type ParametersArgs = {
  context: GenerateContextType
  title: string
  parameters: OasParameter[]
  definitions?: Definitions
}

/**
 * Renders a titled group of parameters — `## Path parameters` and the like —
 * the Markdown counterpart of the docs viewer's `Parameters`.
 *
 * Renders the empty string when the group has no parameters, so an operation
 * can interpolate every group (path / query / header / cookie) unconditionally.
 */
export class Parameters extends SnippetBase {
  title: string
  parameters: Parameter[]

  constructor({ context, title, parameters, definitions }: ParametersArgs) {
    super({ context })

    this.title = title
    this.parameters = parameters.map(parameter => new Parameter({ context, parameter, definitions }))
  }

  override toString(): string {
    if (this.parameters.length === 0) {
      return ''
    }

    return [`## ${this.title}`, ...this.parameters.map(parameter => parameter.toString())].join(
      '\n\n'
    )
  }
}

type ParameterArgs = {
  context: GenerateContextType
  parameter: OasParameter
  definitions?: Definitions
}

/**
 * Renders one parameter, then a collated example.
 *
 * The parameter's schema renders through {@link Schema} — so an object
 * parameter expands its fields like any other schema — with the parameter's own
 * `description` supplied as the external override (a parameter's description
 * lives on the parameter, not its schema). A parameter without a schema (a
 * `content`-typed parameter) falls back to its bold name and description.
 */
class Parameter extends SnippetBase {
  name: Name
  schema: Schema | undefined
  description: Description
  example: Example

  constructor({ context, parameter, definitions }: ParameterArgs) {
    super({ context, stackTrail: parameter.stackTrail.clone() })

    this.name = new Name({ context, name: parameter.name })
    this.schema = parameter.schema
      ? new Schema({
          context,
          name: parameter.name,
          schema: parameter.schema,
          required: parameter.required,
          description: parameter.description,
          definitions
        })
      : undefined
    this.description = new Description({ context, description: parameter.description })
    this.example = new Example({ context, example: toExample(parameter.schema) })
  }

  override toString(): string {
    const description = this.description.toString()
    const header =
      this.schema?.toString() ??
      [`${this.name}`, description && `— ${description}`].filter(part => part !== '').join(' ')
    const example = this.example.toString()

    return example ? `${header}\n\n${example}` : header
  }
}
