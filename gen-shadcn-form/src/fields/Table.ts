import { List, SnippetBase } from '@skmtc/core'
import { TypescriptSnippet } from '@skmtc/lang-typescript'
import type {
  CustomValue,
  EntryList,
  GenerateContextType,
  ListArray,
  ListLines,
  OasRef,
  OasSchema,
  Stringable,
  TypeSystemValue
} from '@skmtc/core'
import { OasObject } from '@skmtc/core'
import { getLabel, schemaToField } from '../schemaToField.ts'
import { toTsValue } from '@skmtc/gen-typescript'

type TableArgs = {
  context: GenerateContextType
  schema: OasSchema | OasRef<'schema'>
  name: string
  label: string | undefined
  destinationPath: string
  isRequired: boolean
  topLevelSchema: OasSchema | OasRef<'schema'>
}

export class Table extends SnippetBase {
  constructor({
    context,
    label,
    schema,
    name,
    isRequired,
    destinationPath,
    topLevelSchema
  }: TableArgs) {
    super({ context, schema })

    const resolvedSchema = schema.resolve()

    return resolvedSchema.type === 'object'
      ? new ObjectTable({
          context,
          schema,
          name,
          label,
          destinationPath,
          isRequired,
          topLevelSchema
        })
      : new SimpleTable({
          context,
          schema: resolvedSchema,
          name,
          label,
          destinationPath,
          isRequired,
          topLevelSchema
        })
  }
}

type SimpleTableArgs = {
  context: GenerateContextType
  schema: OasSchema
  name: string
  label: string | undefined
  destinationPath: string
  isRequired: boolean
  topLevelSchema: OasSchema | OasRef<'schema'>
}

export class SimpleTable extends TypescriptSnippet {
  name: string
  headers: ListArray<Stringable>
  label: string | undefined
  rowRender: TableObjectRowRender

  constructor({
    context,
    label,
    schema,
    name,
    isRequired,
    destinationPath,
    topLevelSchema
  }: SimpleTableArgs) {
    super({ context })

    const parentSchema = schema.resolve()

    this.label = label ?? getLabel({ schema: parentSchema, name: 'table' })

    this.headers = List.toArray([`'temp'`])

    this.name = name

    this.rowRender = new SimpleTableRowRender({
      context,
      parentName: name,
      destinationPath,
      parentSchema,
      isRequired,
      topLevelSchema
    })

    this.register({
      imports: {
        '@/components/fields/list-input': ['ListInput']
      },
      destinationPath
    })
  }

  override toString() {
    return `<ListInput
      label="${this.label}"
      lens={lens.focus(\`${this.name}\`).defined()}
      headers={${this.headers}}
      itemName="${this.name}"
      renderRow={${this.rowRender}}
    />`
  }
}

type ObjectTableArgs = {
  context: GenerateContextType
  schema: OasSchema | OasRef<'schema'>
  name: string
  label: string | undefined
  destinationPath: string
  isRequired: boolean
  topLevelSchema: OasSchema | OasRef<'schema'>
}

export class ObjectTable extends TypescriptSnippet {
  name: string
  headers: ListArray<Stringable>
  label: string | undefined
  rowRender: TableObjectRowRender

  constructor({
    context,
    label,
    schema,
    name,
    isRequired,
    destinationPath,
    topLevelSchema
  }: ObjectTableArgs) {
    super({ context })

    const resolvedSchema = schema.resolve()

    const parentSchema =
      resolvedSchema.type === 'object'
        ? resolvedSchema
        : new OasObject({
            properties: {
              name: resolvedSchema
            }
          })

    const items = List.fromEntries(parentSchema.properties ?? {})

    this.label = label ?? getLabel({ schema: parentSchema, name: 'table' })

    this.headers = items.toArray(([name, schema]) => `'${getLabel({ schema, name })}'`)

    this.name = name

    this.rowRender = new TableObjectRowRender({
      context,
      parentName: name,
      destinationPath,
      parentSchema,
      items,
      isRequired,
      topLevelSchema
    })

    this.register({
      imports: {
        '@/components/fields/list-input': ['ListInput']
      },
      destinationPath
    })
  }

  override toString() {
    return `<ListInput
      label="${this.label}"
      lens={lens.focus(\`${this.name}\`).defined()}
      headers={${this.headers}}
      itemName="${this.name}"
      renderRow={${this.rowRender}}
    />`
  }
}

type SimpleTableRowRenderArgs = {
  context: GenerateContextType
  parentName: string
  parentSchema: OasSchema
  destinationPath: string
  isRequired: boolean
  topLevelSchema: OasSchema | OasRef<'schema'>
}

class SimpleTableRowRender extends TypescriptSnippet {
  parentName: string
  cells: ListLines<Stringable>
  rowType: TypeSystemValue
  constructor({
    context,
    parentName,
    destinationPath,
    parentSchema,
    isRequired,
    topLevelSchema
  }: SimpleTableRowRenderArgs) {
    super({ context })

    this.parentName = parentName

    this.rowType = toTsValue({
      schema: topLevelSchema,
      destinationPath,
      required: isRequired,
      context
    })

    this.cells = List.toLines([
      `<TableCell className="px-3">${schemaToField({
        context,
        schema: parentSchema,
        name: `${parentName}.\${index}`,
        skipLabel: true,
        label: getLabel({ schema: parentSchema, name }),
        destinationPath,
        isRequired,
        topLevelSchema
      })}</TableCell>`
    ])

    this.cells.values
      .push(`<TableCell className="px-1"><Button type="button" size="sm" variant="ghost" onClick={() => remove(index)}>
        <X className="h-3.5 w-3.5" />
      </Button></TableCell>`)

    this.register({
      imports: {
        'lucide-react': ['X'],
        '@/components/ui/button': ['Button'],
        '@/components/ui/table': ['TableCell', 'TableRow'],
        '@/components/fields/list-input': ['RenderRowProps']
      },
      destinationPath
    })
  }

  override toString() {
    return `({ row, index, remove }:RenderRowProps) => <TableRow key={row.id}>${this.cells}</TableRow>`
  }
}

type TableObjectRowRenderArgs = {
  context: GenerateContextType
  parentName: string
  parentSchema: OasObject
  items: EntryList<OasSchema | OasRef<'schema'> | CustomValue>
  destinationPath: string
  isRequired: boolean
  topLevelSchema: OasSchema | OasRef<'schema'>
}

class TableObjectRowRender extends TypescriptSnippet {
  parentName: string
  cells: ListLines<Stringable>
  rowType: TypeSystemValue
  constructor({
    context,
    parentName,
    destinationPath,
    parentSchema,
    items,
    isRequired,
    topLevelSchema
  }: TableObjectRowRenderArgs) {
    super({ context })

    this.parentName = parentName

    this.rowType = toTsValue({
      schema: topLevelSchema,
      destinationPath,
      required: isRequired,
      context
    })

    this.cells = items.toLines(([name, schema]) => {
      return `<TableCell className="px-2">${schemaToField({
        context,
        schema,
        name: `${parentName}.\${index}.${name}`,
        skipLabel: true,
        label: getLabel({ schema, name }),
        destinationPath,
        isRequired: Boolean(parentSchema.required?.includes(name)),
        topLevelSchema
      })}</TableCell>`
    })

    this.cells.values
      .push(`<TableCell className="px-1"><Button type="button" size="sm" variant="ghost" onClick={() => remove(index)}>
        <X className="h-3.5 w-3.5" />
      </Button></TableCell>`)

    this.register({
      imports: {
        'lucide-react': ['X'],
        '@/components/ui/button': ['Button'],
        '@/components/ui/table': ['TableCell', 'TableRow'],
        '@/components/fields/list-input': ['RenderRowProps']
      },
      destinationPath
    })
  }

  override toString() {
    return `({ row, index, remove }:RenderRowProps) => <TableRow key={row.id}>${this.cells}</TableRow>`
  }
}
