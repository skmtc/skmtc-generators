import invariant from 'tiny-invariant'
import type { OperationInsertableArgs, RefName } from '@skmtc/core'
import { TanstackQuery, toListItem } from '@skmtc/gen-tanstack-query-zod'
import { ShadcnSelectApiBase } from './base.ts'
import type { EnrichmentSchema } from './enrichments.ts'
import { PathParams } from './PathParams.ts'
import { CustomValue, FunctionParameter, Identifier } from '@skmtc/core'
import { toTsValue } from '@skmtc/gen-typescript'
import { InputOption } from './InputOption.ts'
export class ShadcnSelectInput extends ShadcnSelectApiBase {
  clientName: string
  pathParams: PathParams
  parameter: FunctionParameter
  option: InputOption
  itemName: string

  constructor({ context, operation, settings }: OperationInsertableArgs<EnrichmentSchema>) {
    super({ context, operation, settings })

    const listItemRef = toListItem({ operation })

    const listItem = listItemRef.resolve()

    invariant(listItem.type === 'object', 'Expected object type')

    this.clientName = this.insertOperation(TanstackQuery, operation).toName()

    this.itemName = 'item'

    this.option = new InputOption({
      context,
      itemName: this.itemName,
      formatter: settings.enrichments?.input.formatter,
      accessorPath: settings.enrichments?.input.accessorPath ?? [],
      destinationPath: settings.exportPath
    })

    const inputPropsSchema = operation
      .toParametersObject(['path'])
      .addProperty({
        name: 'onChange',
        schema: new CustomValue({ context, value: `(value: string) => void` }),
        required: true
      })
      .addProperty({
        name: 'value',
        schema: new CustomValue({ context, value: `string` }),
        required: true
      })
      .addProperty({
        name: 'placeholder',
        schema: new CustomValue({ context, value: `string` }),
        required: false
      })

    const typeDefinition = this.createAndRegisterDefinition({
      identifier: Identifier.createType(`${settings.identifier.name}Props`),
      schema: inputPropsSchema,
      schemaToValueFn: toTsValue,
      rootRef: 'none' as RefName
    })

    this.parameter = new FunctionParameter({ name: 'props', typeDefinition, required: true })

    this.pathParams = new PathParams({
      context,
      operation,
      settings: {
        ...settings,
        identifier: Identifier.createVariable('pathParams')
      }
    })

    this.register({
      imports: {
        '@/components/ui/select.tsx': [
          'SelectItem',
          'Select',
          'SelectContent',
          'SelectTrigger',
          'SelectValue'
        ]
      }
    })
  }

  override toString(): string {
    return `(${this.parameter}) => {


  const { data } = ${this.clientName}(${this.pathParams.destructuredPathParams})

  return (
    <Select onValueChange={props.onChange} defaultValue={props.value}>
      <SelectTrigger>
        <SelectValue placeholder={props.placeholder} />
      </SelectTrigger>
      <SelectContent>{data?.map(item => (
        <SelectItem key={item.id} value={item.id}>
          ${this.option}
        </SelectItem>
      ))}</SelectContent>
    </Select>
  )
}`
  }
}
