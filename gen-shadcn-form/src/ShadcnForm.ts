import { FunctionParameter, handleKey, List, toStringLiteral } from '@skmtc/lang-typescript'
import { TanstackQuery, toObjectSchema } from '@skmtc/gen-tanstack-query-supabase-zod'
import { CustomValue, decapitalize, capitalize } from '@skmtc/core'
import { TsProjection } from '@skmtc/gen-typescript'
import { ShadcnFormBase } from './base.ts'
import type { EnrichmentSchema } from './enrichments.ts'
import type { OasSchema, OasRef, OasObject, OasOperationProjectionConstructorArgs } from '@skmtc/core'
import invariant from 'tiny-invariant'
import { ZodProjection } from '@skmtc/gen-zod'
import { FormFields } from './FormFields.ts'

export class ShadcnForm extends ShadcnFormBase {
  parameter: FunctionParameter
  clientName: string
  tsRequestBodyName: string
  zodRequestBodyName: string
  fields: FormFields
  formValuesType: string
  /** The call that requires the properties with a field, or nothing. */
  required: string
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

    invariant(toObjectSchema(requestBody), 'Schema must be an object')

    this.fields = new FormFields({ context, operation, settings })

    // Only a zod object has `.required`
    const isZodObject = requestBody.resolve().type === 'object' && !isAnnotated(zodRequestBody.value)

    this.formValuesType = isZodObject
      ? toFormValuesType(this.tsRequestBodyName, this.fields)
      : this.tsRequestBodyName
    this.required = isZodObject ? `.required(${toRequiredMask(this.fields)})` : ''

    const formArgsSchema = operation
      .toParametersObject()
      .addProperty({
        name: 'defaultValues',
        schema: new CustomValue({ context, value: this.formValuesType }),
        required: false
      })
      .addProperty({
        name: 'onSuccess',
        schema: new CustomValue({ context, value: `() => void` }),
        required: false
      })

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

    this.registerInto('@/demo.tsx', {
      imports: {
        [this.settings.exportPath]: [this.settings.identifier.name]
      }
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
    const { title, description, submitLabel } = this.settings.enrichments.subject ?? {}

    return `(${this.parameter}) => {
  const form = useForm<${this.formValuesType}>({
    resolver: zodResolver(${this.zodRequestBodyName}${this.required}),
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

/**
 * The type of the form's values: every property of the body is required. A
 * property with no field stays as the body has it, as no one can fill it in.
 */
const toFormValuesType = (bodyName: string, { keptNames, cutNames }: FormFields): string => {
  if (cutNames.length === 0) {
    return `Required<${bodyName}>`
  }

  // Not `Omit`, which loses the named keys of a body with an index signature
  return keptNames.length === 0
    ? bodyName
    : `${bodyName} & Required<Pick<${bodyName}, ${keptNames.map(name => toStringLiteral(name)).join(' | ')}>>`
}

/**
 * Whether gen-zod types the body's model `z.ZodType<T>` (`ZodProjection.annotated`),
 * or the model that it is an alias of (`ZodRef.annotatedModel`). An inline body
 * has no type of its own.
 */
const isAnnotated = (value: unknown): boolean =>
  value instanceof ZodProjection &&
  (value.annotated || ('annotatedModel' in value.value && value.value.annotatedModel === true))

/** The argument of the resolver's `.required()`, which requires the same properties. */
const toRequiredMask = ({ keptNames, cutNames }: FormFields): string => {
  return cutNames.length === 0
    ? ''
    : `${List.toObject(keptNames.map(name => List.toKeyValue(handleKey(name), 'true')))}`
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
  const resolved = toObjectSchema(schema)

  invariant(resolved, 'Schema must be an object')

  const pathItemSchema = resolved.properties?.[path]

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
