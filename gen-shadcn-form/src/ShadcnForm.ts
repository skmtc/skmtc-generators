import { TanstackQuery } from '@skmtc/gen-tanstack-query-supabase-zod'
import {
  CustomValue,
  decapitalize,
  FunctionParameter,
  List,
  OasVoid,
  capitalize
} from '@skmtc/core'
import { TsInsertable } from '@skmtc/gen-typescript'
import { ShadcnFormBase } from './base.ts'
import type { EnrichmentSchema } from './enrichments.ts'
import { EnumsField } from './EnumsField.ts'
import { InputField } from './InputField.ts'
import type {
  OasSchema,
  OasRef,
  OasObject,
  ListLines,
  Stringable,
  OperationInsertableArgs
} from '@skmtc/core'
import invariant from 'tiny-invariant'
import { ZodInsertable } from '@skmtc/gen-zod'

export class ShadcnForm extends ShadcnFormBase {
  parameter: FunctionParameter
  clientName: string
  tsRequestBodyName: string
  zodRequestBodyName: string
  formFields: ListLines<Stringable> | undefined
  constructor({ context, operation, settings }: OperationInsertableArgs<EnrichmentSchema>) {
    super({ context, operation, settings })

    const tsRequestBody = this.insertNormalizedModel(TsInsertable, {
      schema: operation.toRequestBody(({ schema }) => schema)?.resolve() ?? OasVoid.empty(),
      fallbackName: `${capitalize(settings.identifier.name)}Body`
    })

    this.tsRequestBodyName = tsRequestBody.identifier.name

    const zodRequestBody = this.insertNormalizedModel(ZodInsertable, {
      schema: operation.toRequestBody(({ schema }) => schema) ?? OasVoid.empty(),
      fallbackName: `${decapitalize(settings.identifier.name)}Body`
    })

    this.zodRequestBodyName = zodRequestBody.identifier.name

    const formArgsSchema = operation
      .toParametersObject()
      .addProperty({
        name: 'defaultValues',
        schema: new CustomValue({ context, value: this.tsRequestBodyName }),
        required: false
      })
      .addProperty({
        name: 'onSuccess',
        schema: new CustomValue({ context, value: `() => void` }),
        required: false
      })

    const body = operation.toRequestBody(({ schema }) => schema)?.resolve()

    invariant(body?.type === 'object', 'Schema must be an object')

    const formFields = settings.enrichments?.form?.fields
      ?.map(field => {
        const schemaAtPath = pathToOptions({
          path: field.accessorPath,
          schema: body
        })

        return { field, schemaAtPath }
      })
      .filter(({ schemaAtPath }) => schemaAtPath !== null)
      .map(({ field, schemaAtPath }) => {
        // TODO Replace ! with some kind of guard clause
        const { schema } = schemaAtPath!

        const resolved = schema.resolve()

        if ('enums' in resolved && resolved.enums) {
          return new EnumsField({
            context,
            field,
            enums: resolved.enums,
            destinationPath: settings.exportPath
          })
        }

        return new InputField({
          context,
          field,
          schema,
          destinationPath: settings.exportPath
        })
      })

    this.formFields = List.toLines(formFields ?? [])

    const typeDefinition = this.insertNormalizedModel(TsInsertable, {
      schema: formArgsSchema,
      fallbackName: `${settings.identifier.name}Props`
    })

    this.parameter = new FunctionParameter({ name: 'props', typeDefinition, required: true })

    this.clientName = this.insertOperation(TanstackQuery, operation).toName()

    this.insertNormalizedModel(TsInsertable, {
      schema: operation.toParametersObject(['path']),
      fallbackName: capitalize(`${settings.identifier.name}PathParams`)
    })

    this.register({
      imports: {
        '@hookform/resolvers/zod': ['zodResolver'],
        'react-hook-form': ['useForm'],
        '@/components/ui/form': ['Form'],
        '@/components/ui/button': ['Button'],
        '@hookform/lenses': ['useLens'],
        react: ['useEffect']
      }
    })
  }

  override toString(): string {
    const { title, description, submitLabel } = this.settings.enrichments?.form ?? {}

    return `(${this.parameter}) => {
  const form = useForm<${this.tsRequestBodyName}>({
    resolver: zodResolver(${this.zodRequestBodyName}),
    defaultValues: props.defaultValues
  })

  const lens = useLens(form)

  const mutator = ${this.clientName}()

  useEffect(() => {
    if (mutator.isSuccess && props.onSuccess) {
      props.onSuccess()
    }
  }, [mutator.isSuccess])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((body, event) => {
        event?.preventDefault()

        mutator.mutate({ ...props, body })
      })} className="flex flex-col flex-1 gap-4 p-4">
        ${title || description ? `<div className="flex flex-col gap-2">` : ''}
          ${title ? `<h2 className="text-2xl font-semibold tracking-tight">${title}</h2>` : ''}
          ${description ? `<p className="text-muted-foreground">${description}</p>` : ''}
        ${title || description ? `</div>` : ''}

        ${this.formFields}

        <Button type="submit">${submitLabel || 'Submit'}</Button>
      </form>
    </Form>
  )
}
`
  }
}

type SubtractPathFromSchemaArgs = {
  path: string
  schema: OasSchema | OasRef<'schema'>
}

export type PropertyOption = {
  name: string
  schema: OasSchema | OasRef<'schema'>
  required: boolean
}

type PathOptionsAcc = {
  schema: OasSchema | OasRef<'schema'>
  options: PropertyOption[]
}

type PathToOptionsArgs = {
  path: string[]
  schema: OasObject
}

export const pathToOptions = ({ path, schema }: PathToOptionsArgs) => {
  const result = path.reduce<PathOptionsAcc | null>(
    (acc, pathItem): PathOptionsAcc | null => {
      if (!acc) {
        return null
      }

      const option = subtractPathFromSchema({ path: pathItem, schema: acc.schema })

      return option
        ? {
            schema: option.schema,
            options: [...acc.options, option]
          }
        : null
    },
    { schema, options: [] }
  )

  return result
}

export const subtractPathFromSchema = ({
  path,
  schema
}: SubtractPathFromSchemaArgs): PropertyOption | null => {
  const resolved = schema.resolve()

  invariant(resolved.type === 'object', 'Schema must be an object')

  const pathItemSchema = resolved.properties?.[path as keyof typeof resolved.properties]

  invariant(pathItemSchema?.type !== 'custom', 'Path item schema must not be custom')

  if (!pathItemSchema) {
    return null
  }

  const resolvedSchema = pathItemSchema.resolve()

  return {
    name: path,
    schema: resolvedSchema satisfies OasSchema | OasRef<'schema'>,
    required: resolved.required?.includes(path) ?? false
  }
}
