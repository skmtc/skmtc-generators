/** A body, or a property of one, that is an `allOf` in a cycle (#117). */
import { assertEquals, assertFalse, assertStringIncludes } from '@std/assert'
import type { SystemSettings } from '@skmtc/core'
import { assertNoResultErrors, keepAllRefs, operationDocument, runE2eFixture } from '@skmtc/test-support'
import type { OpenAPIV3 } from 'openapi-types'
import { ShadcnFormEntry } from '../src/mod.ts'

type Schemas = NonNullable<OpenAPIV3.ComponentsObject['schemas']>

const toRef = (name: string): OpenAPIV3.ReferenceObject => ({ $ref: `#/components/schemas/${name}` })

const text: OpenAPIV3.SchemaObject = { type: 'string' }

/** The form for `POST /users`, whose request body is `NewUser`. */
const toForm = (schemas: Schemas, system?: SystemSettings): string => {
  const { artifacts, manifest } = runE2eFixture({
    id: '@skmtc/gen-shadcn-form',
    entry: ShadcnFormEntry,
    system,
    document: { ...operationDocument, components: { schemas: { ...operationDocument.components?.schemas, ...schemas } } }
  })

  assertNoResultErrors(manifest)

  return artifacts['src/forms/CreateUsersForm.generated.tsx']
}

const toFieldNames = (form: string): string[] =>
  Array.from(form.matchAll(/lens\.focus\(`([^`]*)`\)/g), ([, name]) => name)

const base: OpenAPIV3.SchemaObject = { type: 'object', properties: { id: text, subs: { type: 'array', items: toRef('Sub') } } }
const sub: OpenAPIV3.SchemaObject = { allOf: [toRef('Base'), { type: 'object', properties: { name: text } }] }

Deno.test('intersection - a property has the fields of every member', () => {
  const form = toForm({
    NewUser: { type: 'object', properties: { sub: toRef('Sub'), n: text } },
    Base: base,
    Sub: sub
  })

  assertEquals(toFieldNames(form), ['sub.id', 'sub.name', 'n'])
})

Deno.test('intersection - a body has the fields of every member, and its schema has no .required', () => {
  const form = toForm({
    NewUser: { allOf: [toRef('Base'), { type: 'object', properties: { name: text } }] },
    Base: { type: 'object', properties: { id: text, subs: { type: 'array', items: toRef('NewUser') } } }
  })

  assertEquals(toFieldNames(form), ['id', 'name'])
  assertStringIncludes(form, 'useForm<NewUser>({\n    resolver: zodResolver(newUser),')
})

// `newUser` is typed `z.ZodType<NewUser>`, which has no `.required` (TS2339).
Deno.test('intersection - a body with an inline one that leads back to it has no field for it, and no .required', () => {
  const form = toForm({
    NewUser: {
      type: 'object',
      properties: { name: text, next: { allOf: [toRef('NewUser'), { type: 'object', properties: { extra: text } }] } }
    }
  })

  assertEquals(toFieldNames(form), ['name'])
  assertFalse(form.includes('.required('))
  assertStringIncludes(form, 'useForm<NewUser>({')
})

Deno.test('intersection - an inline one that leads back to a model below the body is cut there', () => {
  const form = toForm({
    NewUser: { type: 'object', properties: { x: { allOf: [toRef('Node'), { type: 'object', properties: { own: text } }] } } },
    Node: {
      type: 'object',
      properties: { label: text, y: { allOf: [toRef('Node'), { type: 'object', properties: { more: text } }] } }
    }
  })

  // `x` closes no cycle, so core merges it. `y` is an intersection, entered once.
  assertEquals(toFieldNames(form), ['x.label', 'x.y.label', 'x.y.more', 'x.own'])
})

Deno.test('intersection - the rows of a table have the columns of every member', () => {
  const form = toForm({
    NewUser: { type: 'object', properties: { rows: { type: 'array', items: toRef('Sub') } } },
    Base: base,
    Sub: sub
  })

  assertEquals(toFieldNames(form), ['rows', 'rows.${index}.id', 'rows.${index}.name'])
  assertStringIncludes(form, "headers={['id', 'name']}")
})

// `ZodIntersection` has no `.required` either, annotated or not.
Deno.test('intersection - a body outside a cycle has no .required', () => {
  const form = toForm(
    { NewUser: { allOf: [toRef('Base'), { type: 'object', properties: { name: text } }] }, Base: { type: 'object', properties: { id: text } } },
    keepAllRefs
  )

  assertEquals(toFieldNames(form), ['id', 'name'])
  assertFalse(form.includes('.required('))
})

Deno.test('intersection - a subtype of the body, and a base of a subtype, are entered once', () => {
  const subtype = toForm({
    NewUser: { type: 'object', properties: { id: text, child: toRef('Child') } },
    Child: { allOf: [toRef('NewUser'), { type: 'object', properties: { name: text } }] }
  })

  assertEquals(toFieldNames(subtype), ['id', 'child.id', 'child.name'])

  const base = toForm({
    NewUser: { type: 'object', properties: { child: toRef('Child') } },
    Parent: { type: 'object', properties: { id: text, other: toRef('Parent'), child: toRef('Child') } },
    Child: { allOf: [toRef('Parent'), { type: 'object', properties: { name: text } }] }
  })

  assertEquals(toFieldNames(base), ['child.id', 'child.other.id', 'child.name'])
})
