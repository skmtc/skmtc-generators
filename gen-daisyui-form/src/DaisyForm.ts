import { capitalize, decapitalize } from '@skmtc/core'
import type { OasOperationInsertableArgs } from '@skmtc/core'
import { TsInsertable } from '@skmtc/gen-typescript'
import { ZodInsertable } from '@skmtc/gen-zod'
import invariant from 'tiny-invariant'
import { DaisyFormBase } from './base.ts'
import type { EnrichmentSchema } from './enrichments.ts'
import { FormFields } from './FormFields.ts'

export class DaisyForm extends DaisyFormBase {
  fields: FormFields
  tsBodyName: string
  zodBodyName: string
  title: string | undefined
  description: string | undefined
  submitLabel: string
  submitColor: string
  showCard: boolean

  constructor({ context, operation, settings }: OasOperationInsertableArgs<EnrichmentSchema>) {
    super({ context, operation, settings })

    const requestBody = operation.toRequestBody(({ schema }) => schema)
    invariant(requestBody, 'DaisyForm: operation must have a request body')

    if (!requestBody.isRef()) {
      requestBody.nullable = false
    }

    const tsBody = this.insertNormalizedModel(TsInsertable, {
      schema: requestBody,
      fallbackName: `${capitalize(settings.identifier.name)}Body`
    })
    this.tsBodyName = tsBody.identifier.name

    const zodBody = this.insertNormalizedModel(ZodInsertable, {
      schema: requestBody,
      fallbackName: `${decapitalize(settings.identifier.name)}Body`
    })
    this.zodBodyName = zodBody.identifier.name

    this.fields = new FormFields({ context, operation, settings })

    const enrichment = settings.enrichments?.form
    // Canonical form-enrichment fields (validated by core's formItem schema)
    this.title = enrichment?.title
    this.description = enrichment?.description
    this.submitLabel = enrichment?.submitLabel ?? 'Submit'

    // DaisyUI-specific overrides come from the `x-daisy-form` operation
    // extension, which bypasses core's formItem schema (it would strip
    // unknown keys). Shape: { submitColor?: DaisyColor, showCard?: boolean,
    // size?: 'xs'|'sm'|'md'|'lg' }
    const ext = (operation.extensionFields?.['x-daisy-form'] ?? {}) as {
      submitColor?: string
      showCard?: boolean
      size?: 'xs' | 'sm' | 'md' | 'lg'
    }
    this.submitColor = ext.submitColor ?? 'primary'
    this.showCard = ext.showCard ?? true

    this.register({
      imports: {
        react: ['useEffect'],
        'react-hook-form': ['useForm', 'Controller'],
        '@hookform/lenses': ['useLens'],
        '@hookform/resolvers/zod': ['zodResolver']
      }
    })
  }

  override toString(): string {
    const propsType = `{ defaultValues?: Partial<${this.tsBodyName}>; onSubmit: (values: ${this.tsBodyName}) => void | Promise<void> }`

    const header =
      this.title || this.description
        ? `<header className="mb-4">
${this.title ? `<h2 className="text-xl font-semibold">${this.title}</h2>` : ''}
${this.description ? `<p className="text-sm opacity-70">${this.description}</p>` : ''}
</header>`
        : ''

    const formBody = `<form
  className="flex flex-col gap-4"
  onSubmit={form.handleSubmit(async (values) => { await props.onSubmit(values); })}
>
  ${header}
  ${this.fields}
  <div className="form-control mt-2">
    <button type="submit" disabled={form.formState.isSubmitting} className="btn btn-${this.submitColor}">
      ${this.submitLabel}
    </button>
  </div>
</form>`

    const wrapped = this.showCard
      ? `<section className="card bg-base-100 shadow"><div className="card-body">${formBody}</div></section>`
      : formBody

    return `(props: ${propsType}) => {
  const form = useForm<${this.tsBodyName}>({
    resolver: zodResolver(${this.zodBodyName}),
    defaultValues: props.defaultValues as ${this.tsBodyName}
  });
  const lens = useLens({ control: form.control });

  useEffect(() => {
    if (props.defaultValues) {
      form.reset(props.defaultValues as ${this.tsBodyName});
    }
  }, [props.defaultValues]);

  return (
    ${wrapped}
  );
}`
  }
}
