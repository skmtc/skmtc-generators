/**
 * Expandable objects, as Stripe marks them: a field that holds an ID or the
 * whole object lists the object in `x-expansionResources`. Each expandable
 * object is defined on its own page under `docs/_types/`, and documents link
 * to it. Writing every expandable object into every document that reached it
 * made each Stripe document about 1 MB.
 */
import { assertEquals, assertStringIncludes } from '@std/assert'
import { StackTrail, toArtifacts, type ClientSettings } from '@skmtc/core'
import type { OpenAPIV3 } from 'openapi-types'
import { mdDocsEntry } from '../src/mod.ts'
import { checkAll } from './helpers/invariants.ts'

const ref = (name: string): OpenAPIV3.ReferenceObject => ({ $ref: `#/components/schemas/${name}` })

/** A field that holds the object's ID, or the object when it is expanded. */
const expandable = (name: string) => ({
  anyOf: [{ type: 'string' }, ref(name)],
  'x-expansionResources': { oneOf: [ref(name)] }
})

const document = {
  openapi: '3.0.3',
  info: { title: 'Payments', version: '1' },
  paths: {
    '/charges/{id}': {
      get: {
        tags: ['charges'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'ok', content: { 'application/json': { schema: ref('charge') } } } }
      }
    }
  },
  components: {
    schemas: {
      charge: {
        type: 'object',
        properties: {
          customer: expandable('customer'),
          outcome: ref('charge_outcome'),
          // A link from the object's page to itself lands on the page's heading.
          refunded_from: ref('charge')
        }
      },
      // On `charge`'s page, a type that links back to `charge`: as Stripe's
      // `file_link` does to `file`, which defined `file` on its own page again.
      charge_outcome: { type: 'object', properties: { reason: { type: 'string' }, charge: ref('charge') } },
      customer: {
        type: 'object',
        properties: { latest_charge: expandable('charge'), address: ref('address') }
      },
      address: { type: 'object', properties: { city: { type: 'string' } } }
    }
  }
}

const run = (settings: ClientSettings) =>
  toArtifacts({
    traceId: 'gen-md-docs-expandable',
    spanId: 'run',
    startAt: Date.now(),
    // The fixture holds the `x-` extension the parser's input type has no field for.
    document: { type: 'oas', value: JSON.parse(JSON.stringify(document)) },
    settings,
    stackTrail: new StackTrail([]),
    silent: true,
    toGeneratorConfigMap: () => ({
      // @ts-expect-error - factory-emitted transform is monomorphic over Acc
      '@skmtc/gen-md-docs': mdDocsEntry
    })
  })

const { artifacts } = run({ basePath: './src', generatedSuffix: '' })

Deno.test('expandable objects - a document links to the page of an expandable object instead of writing it out', () => {
  const markdown = artifacts['src/docs/charges/charges-id-GET.md']

  assertStringIncludes(markdown, '### `200` — ok\n\n[`Charge`](#type-charge)')
  // Only the pointer: `charge`'s own types are on its page, not here.
  assertEquals(
    markdown.split('## Referenced types\n\n')[1],
    '### <a id="type-charge"></a>Charge\n\nSee [`Charge`](../_types/charge.md).'
  )
})

Deno.test("expandable objects - an object's page defines it and the types only it reaches, and links to other objects' pages", () => {
  assertEquals(
    artifacts['src/docs/_types/charge.md'],
    [
      '---\ntype: schema\nname: "charge"\ntitle: "Charge"\n---',
      '# <a id="type-charge"></a>Charge',
      [
        '`object`',
        '- **customer** `union`',
        '  - `string`',
        '  - [`Customer`](#type-customer)',
        '- **outcome** [`ChargeOutcome`](#type-charge_outcome)',
        '- **refunded_from** [`Charge`](#type-charge)'
      ].join('\n'),
      '## Referenced types',
      '### <a id="type-charge_outcome"></a>ChargeOutcome\n\n`object`\n- **reason** `string`\n- **charge** [`Charge`](#type-charge)',
      '### <a id="type-customer"></a>Customer\n\nSee [`Customer`](customer.md).'
    ].join('\n\n')
  )
  assertStringIncludes(artifacts['src/docs/_types/customer.md'], '### <a id="type-charge"></a>Charge\n\nSee [`Charge`](charge.md).')
  assertStringIncludes(artifacts['src/docs/_types/customer.md'], '### <a id="type-address"></a>Address')
})

Deno.test('expandable objects - pages are written only for expandable objects, and every link and index holds', () => {
  assertEquals(Object.keys(artifacts).filter(path => path.includes('/_types/')).sort(), [
    'src/docs/_types/charge.md',
    'src/docs/_types/customer.md'
  ])
  assertEquals(checkAll(artifacts), [])
})

Deno.test("expandable objects - the link follows the page's path with the project's generatedSuffix", () => {
  const { artifacts: suffixed } = run({ basePath: './src' })

  assertStringIncludes(suffixed['src/docs/charges/charges-id-GET.generated.md'], 'See [`Charge`](../_types/charge.generated.md).')
  assertEquals(checkAll(suffixed), [])
})
