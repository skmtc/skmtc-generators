import { TsSnippet, List, toStringLiteral, EntryList, type ListArray, type ListLines } from '@skmtc/lang-typescript'
import type { CustomValue, GenerateContextType, OasRef, OasSchema, Stringable, TypeSystemValue } from '@skmtc/core'
import { OasObject } from '@skmtc/core'
import { toObjectSchema } from '@skmtc/gen-tanstack-query-supabase-zod'
import { getLabel, schemaToField } from '../schemaToField.ts'
import { openModel, repeatsModel, type OpenModels } from '../openModels.ts'
import { toTsValue } from '@skmtc/gen-typescript'

type TableArgs = {
  context: GenerateContextType
  schema: OasSchema | OasRef<'schema'>
  name: string
  label: string | undefined
  destinationPath: string
  isRequired: boolean
  topLevelSchema: OasSchema | OasRef<'schema'>
  openModels: OpenModels
}

export class Table extends TsSnippet {
  constructor({
    context,
    label,
    schema,
    name,
    isRequired,
    destinationPath,
    topLevelSchema,
    openModels
  }: TableArgs) {
    super({ context, stackTrail: schema.stackTrail.clone() })

    const resolvedSchema = schema.resolve()

    const rowModels = openModel({ schema, openModels })

    return toObjectSchema(schema)
      ? new ObjectTable({
          context,
          schema,
          name,
          label,
          destinationPath,
          isRequired,
          topLevelSchema,
          openModels: rowModels
        })
      : new SimpleTable({
          context,
          schema: resolvedSchema,
          name,
          label,
          destinationPath,
          isRequired,
          topLevelSchema,
          openModels: rowModels
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
  openModels: OpenModels
}

export class SimpleTable extends TsSnippet {
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
    topLevelSchema,
    openModels
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
      topLevelSchema,
      openModels
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
  openModels: OpenModels
}

export class ObjectTable extends TsSnippet {
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
    topLevelSchema,
    openModels
  }: ObjectTableArgs) {
    super({ context })

    const parentSchema =
      toObjectSchema(schema) ??
      new OasObject({
        properties: {
          name: schema.resolve()
        }
      })

    // The headers and the cells both come from `items`, so a column that would
    // repeat a model is left out of both.
    const items = new EntryList(
      Object.entries(parentSchema.properties ?? {}).filter(
        ([, schema]) => !repeatsModel({ schema, openModels })
      )
    )

    this.label = label ?? getLabel({ schema: parentSchema, name: 'table' })

    this.headers = items.toArray(([name, schema]) => toStringLiteral(getLabel({ schema, name }) ?? name))

    this.name = name

    this.rowRender = new TableObjectRowRender({
      context,
      parentName: name,
      destinationPath,
      parentSchema,
      items,
      isRequired,
      topLevelSchema,
      openModels
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
  openModels: OpenModels
}

class SimpleTableRowRender extends TsSnippet {
  parentName: string
  cells: ListLines<Stringable>
  rowType: TypeSystemValue
  constructor({
    context,
    parentName,
    destinationPath,
    parentSchema,
    isRequired,
    topLevelSchema,
    openModels
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
        topLevelSchema,
        openModels
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
  openModels: OpenModels
}

class TableObjectRowRender extends TsSnippet {
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
    topLevelSchema,
    openModels
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
        topLevelSchema,
        openModels
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
