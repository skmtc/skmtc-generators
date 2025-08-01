import type { OperationInsertableArgs, RefName } from '@skmtc/core'
import { TanstackQuery, RequestBodyTs, RequestBodyZod } from '@skmtc/gen-tanstack-query-zod'
import { CustomValue, decapitalize, FunctionParameter, Identifier } from '@skmtc/core'
import { toTsValue } from '@skmtc/gen-typescript'
import { ShadcnFormBase } from './base.ts'
import type { EnrichmentSchema } from './enrichments.ts'
import { EnumsField } from './EnumsField.ts'
import { InputField } from './InputField.ts'
import { List } from '@skmtc/core'
import type { OasSchema, OasRef, OasObject } from '@skmtc/core'
import invariant from 'tiny-invariant'
import type { ListLines, Stringable } from '@skmtc/core'

export class ShadcnForm extends ShadcnFormBase {
  parameter: FunctionParameter
  clientName: string
  tsTypeName: string
  zodTypeName: string
  pathParamsZodName: string
  formFields: ListLines<Stringable> | undefined
  constructor({ context, operation, settings }: OperationInsertableArgs<EnrichmentSchema>) {
    super({ context, operation, settings })

    console.log('SETTINGS', settings)

    this.tsTypeName = this.insertOperation(RequestBodyTs, operation).toName()
    this.zodTypeName = this.insertOperation(RequestBodyZod, operation).toName()

    const formArgsSchema = operation
      .toParametersObject()
      .addProperty({
        name: 'defaultValues',
        schema: new CustomValue({ context, value: this.tsTypeName }),
        required: false
      })
      .addProperty({
        name: 'onSuccess',
        schema: new CustomValue({ context, value: `() => void` }),
        required: false
      })

    const body = operation.toRequestBody(({ schema }) => schema)?.resolve()

    invariant(body?.type === 'object', 'Schema must be an object')

    console.log('FIELDS', settings.enrichments?.form?.fields)

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

    console.log('FORM FIELDS', this.formFields)

    const typeDefinition = this.createAndRegisterDefinition({
      identifier: Identifier.createType(`${settings.identifier.name}Props`),
      schema: formArgsSchema,
      schemaToValueFn: toTsValue,
      rootRef: 'none' as RefName
    })

    this.parameter = new FunctionParameter({ name: 'props', typeDefinition, required: true })

    this.clientName = this.insertOperation(TanstackQuery, operation).toName()

    const params = operation.toParametersObject(['path'])

    this.pathParamsZodName = decapitalize(`${settings.identifier.name}PathParams`)

    this.createAndRegisterDefinition({
      schema: params,
      identifier: Identifier.createType(this.pathParamsZodName),
      schemaToValueFn: toTsValue,
      rootRef: 'none' as RefName
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
    return `(${this.parameter}) => {
  const form = useForm<${this.tsTypeName}>({
    resolver: zodResolver(${this.zodTypeName}),
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
        ${this.formFields}

        <Button type="submit">Create</Button>
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
