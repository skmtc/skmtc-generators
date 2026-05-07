import { TanstackQuery } from '@skmtc/gen-tanstack-query-supabase-zod'
import { CustomValue, decapitalize, FunctionParameter, capitalize } from '@skmtc/core'
import { TsProjection } from '@skmtc/gen-typescript'
import { ShadcnFormBase } from './base.ts'
import type { EnrichmentSchema } from './enrichments.ts'
import type { OasSchema, OasRef, OasObject, OasOperationProjectionConstructorArgs } from '@skmtc/core'
import invariant from 'tiny-invariant'
import { ZodProjection } from '@skmtc/gen-zod'
import { FormFields } from './FormFields.ts'
import { join } from 'node:path'

export class ShadcnForm extends ShadcnFormBase {
  parameter: FunctionParameter
  clientName: string
  tsRequestBodyName: string
  zodRequestBodyName: string
  fields: FormFields
  constructor({ context, operation, settings }: OasOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super({ context, operation, settings })

    const requestBody = operation.toRequestBody(({ schema }) => schema)

    invariant(requestBody, 'Request body is required')

    if (!requestBody.isRef()) {
      requestBody.nullable = false
    }

    const tsRequestBody = this.insertNormalizedModel(TsProjection, {
      schema: requestBody,
      fallbackName: `${capitalize(settings.identifier.name)}Body`
    })

    this.tsRequestBodyName = tsRequestBody.identifier.name

    const zodRequestBody = this.insertNormalizedModel(ZodProjection, {
      schema: requestBody,
      fallbackName: `${decapitalize(settings.identifier.name)}Body`
    })

    this.zodRequestBodyName = zodRequestBody.identifier.name

    const formArgsSchema = operation
      .toParametersObject()
      .addProperty({
        name: 'defaultValues',
        schema: new CustomValue({ context, value: `Required<${this.tsRequestBodyName}>` }),
        required: false
      })
      .addProperty({
        name: 'onSuccess',
        schema: new CustomValue({ context, value: `() => void` }),
        required: false
      })

    const body = operation.toRequestBody(({ schema }) => schema)?.resolve()

    invariant(body?.type === 'object', 'Schema must be an object')

    this.fields = new FormFields({ context, operation, settings })

    const typeDefinition = this.insertNormalizedModel(TsProjection, {
      schema: formArgsSchema,
      fallbackName: `${settings.identifier.name}Props`
    })

    this.parameter = new FunctionParameter({ name: 'props', typeDefinition, required: true })

    this.clientName = this.insertOperation(TanstackQuery, operation).toName()

    this.insertNormalizedModel(TsProjection, {
      schema: operation.toParametersObject(['path']),
      fallbackName: capitalize(`${settings.identifier.name}PathParams`)
    })

    context.register({
      imports: {
        [this.settings.exportPath]: [this.settings.identifier.name]
      },
      destinationPath: join('@', 'demo.tsx')
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
  const form = useForm<Required<${this.tsRequestBodyName}>>({
    resolver: zodResolver(${this.zodRequestBodyName}.required()),
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

        ${this.fields}

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
