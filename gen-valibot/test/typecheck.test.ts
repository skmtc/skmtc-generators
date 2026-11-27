/**
 * The ground-truth gate for cycles: emit every recursive shape, compile it
 * against valibot, and load each file first. A pinned string is just as
 * happy to pin output that cannot type-check or that throws when its module
 * loads.
 *
 * Opt-in (`deno task test:typecheck`) because it needs write/run/net, which
 * the default test task does not grant.
 */
import { assertEquals } from '@std/assert'
import {
  additionalPropertiesCases,
  additionalPropertiesDocument,
  awkwardNamesDocument,
  checkGenerated,
  closedValue,
  cycleDocument,
  emptyEnumDocument,
  intersectionCycleDocument,
  intersectionDocument,
  keepAllRefs,
  nodeValue,
  patternDocument,
  paymentValue,
  runE2eFixture,
  stringFormatCases,
  stringFormatDocument,
  unionDocument
} from '@skmtc/test-support'
import { valibotEntry } from '../src/mod.ts'

/** The valibot the output is checked against, the workspace's pin. */
const VALIBOT = 'npm:valibot@1.1.0'

/** The valibot the generator's own `deno.json` names, the newest the task holds. */
const VALIBOT_1_5 = 'npm:valibot@1.5.0'

/**
 * Checks that each named property infers as exactly its own type, and
 * parses every case of `additionalPropertiesCases`. Loading it throws on
 * the first case valibot gets wrong.
 *
 * The trap: an assignment such as `const id: string = value.id` also
 * compiles when `id` is `never` or `any`, so `Equals` compares the types
 * both ways.
 */
const additionalPropertiesConsumer = `import * as v from 'valibot'
import { upload } from '@/types/upload.generated.ts'
import { limits } from '@/types/limits.generated.ts'
import { dotted } from '@/types/dotted.generated.ts'
import { tree } from '@/types/tree.generated.ts'

type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false

export const uploadAppId: Equals<v.InferOutput<typeof upload>['app_id'], string> = true
export const uploadImages: Equals<v.InferOutput<typeof upload>['images'], string[]> = true
export const limitsId: Equals<v.InferOutput<typeof limits>['id'], string> = true
export const limitsNote: Equals<v.InferOutput<typeof limits>['note'], string | undefined> = true
export const dottedKey: Equals<v.InferOutput<typeof dotted>['a.b'], string> = true
export const treeLabel: Equals<v.InferOutput<typeof tree>['label'], string> = true

const accepts: Record<string, (value: unknown) => boolean> = {
  Upload: value => v.safeParse(upload, value).success,
  Limits: value => v.safeParse(limits, value).success,
  Dotted: value => v.safeParse(dotted, value).success,
  Tree: value => v.safeParse(tree, value).success
}

for (const check of ${JSON.stringify(additionalPropertiesCases)}) {
  const accepted = accepts[check.model](check.value)
  if (accepted !== check.accept) {
    throw new Error(\`\${check.model}, \${check.name}: accepted is \${accepted}\`)
  }
}
`

Deno.test({
  name: 'typecheck - every model of a cycle compiles against valibot and loads first',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: '@skmtc/gen-valibot',
      entry: valibotEntry,
      document: cycleDocument
    })

    // A failed run renders no files, and nothing then fails the check.
    assertEquals(Object.keys(artifacts).length, 11)

    assertEquals(await checkGenerated({ artifacts, imports: { valibot: VALIBOT } }), [])
  }
})

Deno.test({
  name: 'typecheck - every discriminated union compiles against valibot and loads first',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: '@skmtc/gen-valibot',
      entry: valibotEntry,
      document: unionDocument
    })

    assertEquals(Object.keys(artifacts).length, 24)

    assertEquals(await checkGenerated({ artifacts, imports: { valibot: VALIBOT } }), [])
  }
})

// The trap: `v.intersect` with `v.record` compiles and accepts
// `additionalProperties: true`, but checks a typed record against the named
// keys too, so valibot rejects `{id: 'x', count: 1}` (#101).
Deno.test({
  name: 'typecheck - a record beside properties checks only the other keys',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: '@skmtc/gen-valibot',
      entry: valibotEntry,
      document: additionalPropertiesDocument
    })

    assertEquals(Object.keys(artifacts).sort(), [
      'src/types/dotted.generated.ts',
      'src/types/limits.generated.ts',
      'src/types/tree.generated.ts',
      'src/types/upload.generated.ts'
    ])

    assertEquals(
      await checkGenerated({
        artifacts: { ...artifacts, 'src/consumer.ts': additionalPropertiesConsumer },
        imports: { valibot: VALIBOT }
      }),
      []
    )
  }
})

// The trap: `decapitalize` turns `Default` into `default`, and
// `export const default = …` does not parse; `2FA` starts with a digit.
Deno.test({
  name: 'typecheck - schema names that are not valid bindings are repaired',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runE2eFixture({ id: '@skmtc/gen-valibot', entry: valibotEntry, document: awkwardNamesDocument })

    assertEquals(Object.keys(artifacts).sort(), [
      'src/types/_2FA.generated.ts',
      'src/types/account.generated.ts',
      'src/types/defaultValue.generated.ts',
      'src/types/deleteValue.generated.ts'
    ])

    assertEquals(await checkGenerated({ artifacts, imports: { valibot: VALIBOT } }), [])
  }
})

/** Loading it throws when an empty enum accepts a value of its type, or null. */
const emptyEnumConsumer = `import * as v from 'valibot'
import { emptyString } from '@/types/emptyString.generated.ts'
import { emptyNumber } from '@/types/emptyNumber.generated.ts'
import { emptyInteger } from '@/types/emptyInteger.generated.ts'
import { emptyBoolean } from '@/types/emptyBoolean.generated.ts'

const cases: Array<[string, (value: unknown) => boolean, unknown]> = [
  ['EmptyString', value => v.safeParse(emptyString, value).success, 'x'],
  ['EmptyNumber', value => v.safeParse(emptyNumber, value).success, 1],
  ['EmptyInteger', value => v.safeParse(emptyInteger, value).success, 1],
  ['EmptyBoolean', value => v.safeParse(emptyBoolean, value).success, true]
]

for (const [name, accepts, sample] of cases) {
  for (const value of [sample, null]) {
    if (accepts(value)) {
      throw new Error(name + ' accepts ' + JSON.stringify(value))
    }
  }
}
`

// The trap: a number, integer or boolean enum gave `v.null()`, which
// accepts `null` where the list allows nothing.
Deno.test({
  name: 'typecheck - an empty enum compiles and accepts nothing',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runE2eFixture({ id: '@skmtc/gen-valibot', entry: valibotEntry, document: emptyEnumDocument })

    assertEquals(
      await checkGenerated({
        artifacts: { ...artifacts, 'src/consumer.ts': emptyEnumConsumer },
        imports: { valibot: VALIBOT }
      }),
      []
    )
  }
})

// Parses a value through an intersection (Pet), and through a union whose
// members are intersections (Payment). Loading it throws when valibot
// refuses a value the document allows, or accepts a Pet without the key of
// Animal.
const intersectionConsumer = `import * as v from 'valibot'
import { pet } from '@/types/pet.generated.ts'
import { payment } from '@/types/payment.generated.ts'

const results: [string, boolean, boolean][] = [
  ['Pet', v.safeParse(pet, { kind: 'dog', name: 'Rex' }).success, true],
  ['Pet without the key of Animal', v.safeParse(pet, { name: 'Rex' }).success, false],
  ['Payment', v.safeParse(payment, ${JSON.stringify(paymentValue)}).success, true]
]

for (const [name, success, expected] of results) {
  if (success !== expected) throw new Error(\`\${name}: accepted is \${success}\`)
}
`

Deno.test({
  name: 'typecheck - an intersection, and a union of intersections, compile against valibot and parse',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: '@skmtc/gen-valibot',
      entry: valibotEntry,
      document: intersectionDocument,
      system: keepAllRefs
    })

    assertEquals(Object.keys(artifacts).length, 6)

    assertEquals(
      await checkGenerated({
        artifacts: { ...artifacts, 'src/consumer.ts': intersectionConsumer },
        imports: { valibot: VALIBOT }
      }),
      []
    )
  }
})

// Closed has \`additionalProperties: false\` beside its \`allOf\`. The parser
// puts it on the member with \`b\`, and a strict object there would refuse
// the keys of Base.
const intersectionCycleConsumer = `import * as v from 'valibot'
import { node } from '@/types/node.generated.ts'
import { closed } from '@/types/closed.generated.ts'

const accepted: [string, boolean][] = [
  ['Node', v.safeParse(node, ${JSON.stringify(nodeValue)}).success],
  ['Closed', v.safeParse(closed, ${JSON.stringify(closedValue)}).success]
]

for (const [name, success] of accepted) {
  if (!success) throw new Error(\`\${name} refused a value its document allows\`)
}
`

Deno.test({
  name: 'typecheck - an intersection with a ref that closes a cycle compiles against valibot, loads first and parses',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: '@skmtc/gen-valibot',
      entry: valibotEntry,
      document: intersectionCycleDocument
    })

    // A failed run renders no files, and nothing then fails the check.
    assertEquals(Object.keys(artifacts).length, 3)

    assertEquals(
      await checkGenerated({
        artifacts: { ...artifacts, 'src/consumer.ts': intersectionCycleConsumer },
        imports: { valibot: VALIBOT }
      }),
      []
    )
  }
})

/**
 * Models whose format valibot has no action for (`src/formats.ts`). They stay
 * a plain string, so they accept every case, also one `stringFormatCases`
 * marks as refused.
 */
const uncheckedModels = ['Duration']

/** Loading it throws on the first case of `stringFormatCases` valibot gets wrong. */
const stringFormatConsumer = `import * as v from 'valibot'
import { dateTime } from '@/types/dateTime.generated.ts'
import { date } from '@/types/date.generated.ts'
import { duration } from '@/types/duration.generated.ts'
import { email } from '@/types/email.generated.ts'
import { uri } from '@/types/uri.generated.ts'
import { uuid } from '@/types/uuid.generated.ts'
import { ipv4 } from '@/types/ipv4.generated.ts'
import { ipv6 } from '@/types/ipv6.generated.ts'
import { uriTemplate } from '@/types/uriTemplate.generated.ts'
import { slug } from '@/types/slug.generated.ts'
import { workEmail } from '@/types/workEmail.generated.ts'

const models: Record<string, v.GenericSchema<unknown, string>> = {
  DateTime: dateTime,
  Date: date,
  Duration: duration,
  Email: email,
  Uri: uri,
  Uuid: uuid,
  Ipv4: ipv4,
  Ipv6: ipv6,
  UriTemplate: uriTemplate,
  Slug: slug,
  WorkEmail: workEmail
}

const unchecked: string[] = ${JSON.stringify(uncheckedModels)}

for (const check of ${JSON.stringify(stringFormatCases)}) {
  const accepted = v.safeParse(models[check.model], check.value).success
  const expected = unchecked.includes(check.model) || check.accept
  if (accepted !== expected) {
    throw new Error(\`\${check.model}, \${JSON.stringify(check.value)}: accepted is \${accepted}\`)
  }
}
`

// The trap: an action that came in after valibot 1.1 breaks generated code
// for a user on 1.1, so each format compiles and parses on the oldest and the
// newest.
for (const valibot of [VALIBOT, VALIBOT_1_5]) {
  Deno.test({
    name: `typecheck - each string format and pattern compiles and parses on ${valibot}`,
    ignore: Deno.env.get('TYPECHECK') !== '1',
    fn: async () => {
      const { artifacts } = runE2eFixture({
        id: '@skmtc/gen-valibot',
        entry: valibotEntry,
        document: stringFormatDocument
      })

      assertEquals(Object.keys(artifacts).length, 11)

      assertEquals(
        await checkGenerated({
          artifacts: { ...artifacts, 'src/consumer.ts': stringFormatConsumer },
          imports: { valibot }
        }),
        []
      )
    }
  })
}

// The trap: a pattern ending in `\` or written for another engine made the
// file fail to parse; a `*/` in the comment that replaces it would end the
// comment early. Every file has to compile and load.
Deno.test({
  name: 'typecheck - every pattern renders as a regex or a comment, and compiles',
  ignore: Deno.env.get('TYPECHECK') !== '1',
  fn: async () => {
    const { artifacts } = runE2eFixture({
      id: '@skmtc/gen-valibot',
      entry: valibotEntry,
      document: patternDocument
    })

    assertEquals(Object.keys(artifacts).length, 6)

    assertEquals(await checkGenerated({ artifacts, imports: { valibot: VALIBOT } }), [])
  }
})
