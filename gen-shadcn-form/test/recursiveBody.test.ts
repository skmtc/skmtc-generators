/**
 * #122: a request body model that contains itself failed the whole run with
 * "Maximum call stack size exceeded". The form has no field where a model
 * repeats, and keeps every other field.
 */
import { assert, assertEquals, assertFalse, assertStringIncludes } from '@std/assert'
import { StackTrail, toArtifacts } from '@skmtc/core'
import { assertNoResultErrors, operationDocument, runE2eFixture } from '@skmtc/test-support'
import type { OpenAPIV3 } from 'openapi-types'
import { ShadcnFormEntry } from '../src/mod.ts'

type Schemas = NonNullable<OpenAPIV3.ComponentsObject['schemas']>
type Enrichments = Parameters<typeof runE2eFixture>[0]['enrichments']

const toRef = (name: string): OpenAPIV3.ReferenceObject => ({ $ref: `#/components/schemas/${name}` })

const string: OpenAPIV3.SchemaObject = { type: 'string' }

/** The form for `POST /users`, whose request body is `NewUser`. */
const toForm = (schemas: Schemas, enrichments?: Enrichments): string => {
  const { artifacts, manifest } = runE2eFixture({
    id: '@skmtc/gen-shadcn-form',
    entry: ShadcnFormEntry,
    document: {
      ...operationDocument,
      components: { schemas: { ...operationDocument.components?.schemas, ...schemas } }
    },
    enrichments
  })

  assertNoResultErrors(manifest)

  return artifacts['src/forms/CreateUsersForm.generated.tsx']
}

/** The place in the form data of every field, in order. */
const toFieldNames = (form: string): string[] =>
  Array.from(form.matchAll(/lens\.focus\(`([^`]*)`\)/g), ([, name]) => name)

/** The header lists of every table, in order. */
const toHeaders = (form: string): string[] =>
  Array.from(form.matchAll(/headers=\{(\[.*?\])\}/g), ([, headers]) => headers)

Deno.test('recursive body - a model directly inside itself has no field', () => {
  const form = toForm({
    NewUser: { type: 'object', properties: { name: string, parent: toRef('NewUser'), size: string } }
  })

  assertEquals(toFieldNames(form), ['name', 'size'])
})

Deno.test('recursive body - a model inside itself through another model has no field', () => {
  const form = toForm({
    NewUser: { type: 'object', properties: { name: string, b: toRef('B') } },
    B: { type: 'object', properties: { title: string, a: toRef('NewUser') } }
  })

  assertEquals(toFieldNames(form), ['name', 'b.title'])
})

Deno.test('recursive body - a model inside itself through an array has no field, and no table import', () => {
  const form = toForm({
    NewUser: {
      type: 'object',
      properties: {
        name: string,
        children: { type: 'array', items: toRef('NewUser') },
        grid: { type: 'array', items: { type: 'array', items: toRef('NewUser') } },
        crew: toRef('Crew')
      }
    },
    Crew: { type: 'array', items: toRef('NewUser') }
  })

  assertEquals(toFieldNames(form), ['name'])
  assertFalse(form.includes('ListInput'))
})

Deno.test('recursive body - a model below the body that repeats is cut there', () => {
  const form = toForm({
    NewUser: { type: 'object', properties: { node: toRef('Node') } },
    Node: { type: 'object', properties: { label: string, next: toRef('Node') } }
  })

  assertEquals(toFieldNames(form), ['node.label'])
})

Deno.test('recursive body - an array model that holds itself has no field', () => {
  const form = toForm({
    NewUser: { type: 'object', properties: { name: string, list: toRef('Nested') } },
    Nested: { type: 'array', items: toRef('Nested') }
  })

  assertEquals(toFieldNames(form), ['name'])
})

Deno.test('recursive body - a repeat through an alias, or with keywords next to it, has no field', () => {
  const form = toForm({
    NewUser: {
      type: 'object',
      properties: {
        name: string,
        alias: toRef('Alias'),
        described: { allOf: [toRef('NewUser')], description: 'The parent' },
        nullable: { allOf: [toRef('NewUser')], nullable: true },
        one: { oneOf: [toRef('NewUser')] }
      }
    },
    Alias: toRef('NewUser')
  })

  assertEquals(toFieldNames(form), ['name'])
})

Deno.test('recursive body - a table leaves out the column, with its header, that repeats a model', () => {
  const form = toForm({
    NewUser: { type: 'object', properties: { rows: { type: 'array', items: toRef('Row') } } },
    Row: {
      type: 'object',
      properties: {
        first: string,
        self: toRef('Row'),
        owner: toRef('NewUser'),
        rows: { type: 'array', items: toRef('Row') },
        last: string
      }
    }
  })

  assertEquals(toHeaders(form), ["['first', 'last']"])
  assertEquals(toFieldNames(form), ['rows', 'rows.${index}.first', 'rows.${index}.last'])
  // One cell per header, and the one with the remove button
  assertEquals(form.match(/<TableCell /g)?.length, 3)
})

Deno.test('recursive body - a model used twice side by side keeps both its fields', () => {
  const form = toForm({
    NewUser: {
      type: 'object',
      properties: {
        home: toRef('Address'),
        work: toRef('Address'),
        past: { type: 'array', items: toRef('Address') },
        future: { type: 'array', items: toRef('Address') }
      }
    },
    Address: { type: 'object', properties: { street: string } }
  })

  assertEquals(toFieldNames(form), [
    'home.street',
    'work.street',
    'past',
    'past.${index}.street',
    'future',
    'future.${index}.street'
  ])
})

const uncutForm = "useForm<Required<NewUser>>({\n    resolver: zodResolver(newUser.required()),"

Deno.test('recursive body - a property with no field is not required, so the form can be submitted', () => {
  const form = toForm({
    NewUser: {
      type: 'object',
      required: ['name'],
      properties: { name: string, 'nick-name': string, parent: toRef('NewUser') }
    }
  })

  assertStringIncludes(
    form,
    `useForm<NewUser & Required<Pick<NewUser, 'name' | 'nick-name'>>>({
    resolver: zodResolver(newUser.required({name: true, 'nick-name': true})),`
  )
  assertStringIncludes(form, "defaultValues: NewUser & Required<Pick<NewUser, 'name' | 'nick-name'>>,")
})

Deno.test('recursive body - a form with no field at all requires nothing', () => {
  const form = toForm({ NewUser: { type: 'object', properties: { parent: toRef('NewUser') } } })

  assertStringIncludes(form, 'useForm<NewUser>({\n    resolver: zodResolver(newUser.required({})),')
})

Deno.test('recursive body - a body with every field still requires every property', () => {
  const form = toForm({ NewUser: { type: 'object', properties: { name: string, size: string } } })

  assertStringIncludes(form, uncutForm)
  assertStringIncludes(form, 'defaultValues: Required<NewUser>,')
})

// Neither reference ends at a model, so the run fails. It fails with the
// loop's own error, not by following the loop until the stack is full.
Deno.test('recursive body - a column that is a loop of references names the loop', () => {
  const document: OpenAPIV3.Document = {
    ...operationDocument,
    components: {
      schemas: {
        ...operationDocument.components?.schemas,
        NewUser: { type: 'object', properties: { rows: { type: 'array', items: toRef('Row') } } },
        Row: { type: 'object', properties: { loop: toRef('LoopA') } },
        LoopA: toRef('LoopB'),
        LoopB: toRef('LoopA')
      }
    }
  }

  const { manifest } = toArtifacts({
    traceId: 'gen-shadcn-form-loop',
    spanId: 'fixture',
    startAt: Date.now(),
    document: { type: 'oas', value: document },
    settings: { basePath: './src', system: { danglingRefs: ['schema'] } },
    stackTrail: new StackTrail([]),
    silent: true,
    // @ts-expect-error - entry vs the generic config map (the known variance gap)
    toGeneratorConfigMap: () => ({ '@skmtc/gen-shadcn-form': ShadcnFormEntry })
  })

  const issues = JSON.stringify(manifest.parseIssues)

  assertStringIncludes(issues, 'LoopA')
  assertFalse(issues.includes('call stack'))
})

Deno.test('recursive body - the input enrichment still renders a component for a field that repeats the body', () => {
  const form = toForm(
    { NewUser: { type: 'object', properties: { name: string, parent: toRef('NewUser') } } },
    {
      '/users': {
        post: {
          main: {
            fields: [
              {
                moduleSelect: {
                  schemaPath: ['RequestBody', 'parent'],
                  module: { exportName: 'ParentField', exportPath: '@/inputs/ParentField.tsx' }
                }
              }
            ]
          }
        }
      }
    }
  )

  assert(/<ParentField\s+lens=\{lens\.focus\(`parent`\)/.test(form))
  assertStringIncludes(form, `import {ParentField} from '@/inputs/ParentField.tsx'`)
  assertEquals(toFieldNames(form), ['name', 'parent'])
  // A property with a component has a field, so it stays required
  assertStringIncludes(form, uncutForm)
})
