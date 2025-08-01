import { ShadcnSelectApiBase } from './base.ts'
import type { OperationInsertableArgs } from '@skmtc/core'
import type { EnrichmentSchema } from './enrichments.ts'
import { Identifier, CustomValue } from '@skmtc/core'
import type { OasOperation } from '@skmtc/core'
import { ShadcnSelectInput } from './ShadcnSelectInput.ts'
export class ShadcnSelectField extends ShadcnSelectApiBase {
  propsTypeName: string

  selectName: string

  constructor({ context, operation, settings }: OperationInsertableArgs<EnrichmentSchema>) {
    super({ context, operation, settings })

    this.propsTypeName = `${this.settings.identifier.name}Props`

    const propsTypeValue = `{
  lens: Lens<string>
  label?: string
  placeholder?: string
}`

    this.selectName = this.insertOperation(ShadcnSelectInput, operation).toName()

    context.defineAndRegister({
      identifier: Identifier.createType(this.propsTypeName),
      value: new CustomValue({ context, value: propsTypeValue }),
      destinationPath: settings.exportPath
    })

    this.register({
      imports: {
        '@/components/ui/form': [
          'FormField',
          'FormItem',
          'FormLabel',
          'FormControl',
          'FormMessage'
        ],
        '@hookform/lenses': ['Lens']
      }
    })
  }

  static override toIdentifier(operation: OasOperation) {
    const name = ShadcnSelectApiBase.toIdentifier(operation)

    return Identifier.createVariable(`${name}Field`)
  }

  override toString(): string {
    return `({
  label,
  lens,
  placeholder
}: ${this.propsTypeName}) => {
  if(!lens) {
    return null
  }

  const { control, name } = lens.interop()

  return (
    <FormField
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <FormItem className="flex flex-col gap-2 px-px">
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <${this.selectName}
              onChange={onChange}
              value={value}
              placeholder={placeholder}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}`
  }
}
