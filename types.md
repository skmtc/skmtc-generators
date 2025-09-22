┌────────────────────────────────┬─────────────────────────────┬────────────────────────────────┐
│ TypeBox                        │ TypeScript                  │ Json Schema                    │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Any()           │ type T = any                │ const T = { }                  │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Unknown()       │ type T = unknown            │ const T = { }                  │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.String()        │ type T = string             │ const T = {                    │
│                                │                             │   type: 'string'               │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Number()        │ type T = number             │ const T = {                    │
│                                │                             │   type: 'number'               │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Integer()       │ type T = number             │ const T = {                    │
│                                │                             │   type: 'integer'              │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Boolean()       │ type T = boolean            │ const T = {                    │
│                                │                             │   type: 'boolean'              │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Null()          │ type T = null               │ const T = {                    │
│                                │                             │   type: 'null'                 │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Literal(42)     │ type T = 42                 │ const T = {                    │
│                                │                             │   const: 42,                   │
│                                │                             │   type: 'number'               │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Array(          │ type T = number[]           │ const T = {                    │
│   Type.Number()                │                             │   type: 'array',               │
│ )                              │                             │   items: {                     │
│                                │                             │     type: 'number'             │
│                                │                             │   }                            │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Object({        │ type T = {                  │ const T = {                    │
│   x: Type.Number(),            │   x: number,                │   type: 'object',              │
│   y: Type.Number()             │   y: number                 │   required: ['x', 'y'],        │
│ })                             │ }                           │   properties: {                │
│                                │                             │     x: {                       │
│                                │                             │       type: 'number'           │
│                                │                             │     },                         │
│                                │                             │     y: {                       │
│                                │                             │       type: 'number'           │
│                                │                             │     }                          │
│                                │                             │   }                            │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Tuple([         │ type T = [number, number]   │ const T = {                    │
│   Type.Number(),               │                             │   type: 'array',               │
│   Type.Number()                │                             │   items: [{                    │
│ ])                             │                             │     type: 'number'             │
│                                │                             │   }, {                         │
│                                │                             │     type: 'number'             │
│                                │                             │   }],                          │
│                                │                             │   additionalItems: false,      │
│                                │                             │   minItems: 2,                 │
│                                │                             │   maxItems: 2                  │
│                                │                             │ }                              │
│                                │                             │                                │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ enum Foo {                     │ enum Foo {                  │ const T = {                    │
│   A,                           │   A,                        │   anyOf: [{                    │
│   B                            │   B                         │     type: 'number',            │
│ }                              │ }                           │     const: 0                   │
│                                │                             │   }, {                         │
│ const T = Type.Enum(Foo)       │ type T = Foo                │     type: 'number',            │
│                                │                             │     const: 1                   │
│                                │                             │   }]                           │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Const({         │ type T = {                  │ const T = {                    │
│   x: 1,                        │   readonly x: 1,            │   type: 'object',              │
│   y: 2,                        │   readonly y: 2             │   required: ['x', 'y'],        │
│ } as const)                    │ }                           │   properties: {                │
│                                │                             │     x: {                       │
│                                │                             │       type: 'number',          │
│                                │                             │       const: 1                 │
│                                │                             │     },                         │
│                                │                             │     y: {                       │
│                                │                             │       type: 'number',          │
│                                │                             │       const: 2                 │
│                                │                             │     }                          │
│                                │                             │   }                            │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.KeyOf(          │ type T = keyof {            │ const T = {                    │
│   Type.Object({                │   x: number,                │   anyOf: [{                    │
│     x: Type.Number(),          │   y: number                 │     type: 'string',            │
│     y: Type.Number()           │ }                           │     const: 'x'                 │
│   })                           │                             │   }, {                         │
│ )                              │                             │     type: 'string',            │
│                                │                             │     const: 'y'                 │
│                                │                             │   }]                           │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Union([         │ type T = string | number    │ const T = {                    │
│   Type.String(),               │                             │   anyOf: [{                    │
│   Type.Number()                │                             │     type: 'string'             │
│ ])                             │                             │   }, {                         │
│                                │                             │     type: 'number'             │
│                                │                             │   }]                           │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Intersect([     │ type T = {                  │ const T = {                    │
│   Type.Object({                │   x: number                 │   allOf: [{                    │
│     x: Type.Number()           │ } & {                       │     type: 'object',            │
│   }),                          │   y: number                 │     required: ['x'],           │
│   Type.Object({                │ }                           │     properties: {              │
│     y: Type.Number()           │                             │       x: {                     │
│   })                           │                             │         type: 'number'         │
│ ])                             │                             │       }                        │
│                                │                             │     }                          │
│                                │                             │   }, {                         │
│                                │                             │     type: 'object',            |
│                                │                             │     required: ['y'],           │
│                                │                             │     properties: {              │
│                                │                             │       y: {                     │
│                                │                             │         type: 'number'         │
│                                │                             │       }                        │
│                                │                             │     }                          │
│                                │                             │   }]                           │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Composite([     │ type T = {                  │ const T = {                    │
│   Type.Object({                │   x: number,                │   type: 'object',              │
│     x: Type.Number()           │   y: number                 │   required: ['x', 'y'],        │
│   }),                          │ }                           │   properties: {                │
│   Type.Object({                │                             │     x: {                       │
│     y: Type.Number()           │                             │       type: 'number'           │
│   })                           │                             │     },                         │
│ ])                             │                             │     y: {                       │
│                                │                             │       type: 'number'           │
│                                │                             │     }                          │
│                                │                             │   }                            │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Never()         │ type T = never              │ const T = {                    │
│                                │                             │   not: {}                      │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Not(            | type T = unknown            │ const T = {                    │
│   Type.String()                │                             │   not: {                       │
│ )                              │                             │     type: 'string'             │
│                                │                             │   }                            │
│                                │                             │ }                              │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Extends(        │ type T =                    │ const T = {                    │
│   Type.String(),               │  string extends number      │   const: false,                │
│   Type.Number(),               │    ? true                   │   type: 'boolean'              │
│   Type.Literal(true),          │    : false                  │ }                              │
│   Type.Literal(false)          │                             │                                │
│ )                              │                             │                                │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Extract(        │ type T = Extract<           │ const T = {                    │
│   Type.Union([                 │   string | number,          │   type: 'string'               │
│     Type.String(),             │   string                    │ }                              │
│     Type.Number(),             │ >                           │                                │
│   ]),                          │                             │                                │
│   Type.String()                │                             │                                │
│ )                              │                             │                                │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Exclude(        │ type T = Exclude<           │ const T = {                    │
│   Type.Union([                 │   string | number,          │   type: 'number'               │
│     Type.String(),             │   string                    │ }                              │
│     Type.Number(),             │ >                           │                                │
│   ]),                          │                             │                                │
│   Type.String()                │                             │                                │
│ )                              │                             │                                │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Mapped(         │ type T = {                  │ const T = {                    │
│   Type.Union([                 │   [_ in 'x' | 'y'] : number │   type: 'object',              │
│     Type.Literal('x'),         │ }                           │   required: ['x', 'y'],        │
│     Type.Literal('y')          │                             │   properties: {                │
│   ]),                          │                             │     x: {                       │
│   () => Type.Number()          │                             │       type: 'number'           │
│ )                              │                             │     },                         │
│                                │                             │     y: {                       │
│                                │                             │       type: 'number'           │
│                                │                             │     }                          │
│                                │                             │   }                            │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const U = Type.Union([         │ type U = 'open' | 'close'   │ const T = {                    │
│   Type.Literal('open'),        │                             │   type: 'string',              │
│   Type.Literal('close')        │ type T = `on${U}`           │   pattern: '^on(open|close)$'  │
│ ])                             │                             │ }                              │
│                                │                             │                                │
│ const T = Type                 │                             │                                │
│   .TemplateLiteral([           │                             │                                │
│      Type.Literal('on'),       │                             │                                │
│      U                         │                             │                                │
│   ])                           │                             │                                │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Record(         │ type T = Record<            │ const T = {                    │
│   Type.String(),               │   string,                   │   type: 'object',              │
│   Type.Number()                │   number                    │   patternProperties: {         │
│ )                              │ >                           │     '^.*$': {                  │
│                                │                             │       type: 'number'           │
│                                │                             │     }                          │
│                                │                             │   }                            │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Partial(        │ type T = Partial<{          │ const T = {                    │
│   Type.Object({                │   x: number,                │   type: 'object',              │
│     x: Type.Number(),          │   y: number                 │   properties: {                │
│     y: Type.Number()           | }>                          │     x: {                       │
│   })                           │                             │       type: 'number'           │
│ )                              │                             │     },                         │
│                                │                             │     y: {                       │
│                                │                             │       type: 'number'           │
│                                │                             │     }                          │
│                                │                             │   }                            │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Required(       │ type T = Required<{         │ const T = {                    │
│   Type.Object({                │   x?: number,               │   type: 'object',              │
│     x: Type.Optional(          │   y?: number                │   required: ['x', 'y'],        │
│       Type.Number()            | }>                          │   properties: {                │
│     ),                         │                             │     x: {                       │
│     y: Type.Optional(          │                             │       type: 'number'           │
│       Type.Number()            │                             │     },                         │
│     )                          │                             │     y: {                       │
│   })                           │                             │       type: 'number'           │
│ )                              │                             │     }                          │
│                                │                             │   }                            │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Pick(           │ type T = Pick<{             │ const T = {                    │
│   Type.Object({                │   x: number,                │   type: 'object',              │
│     x: Type.Number(),          │   y: number                 │   required: ['x'],             │
│     y: Type.Number()           │ }, 'x'>                     │   properties: {                │
│   }), ['x']                    |                             │     x: {                       │
│ )                              │                             │       type: 'number'           │
│                                │                             │     }                          │
│                                │                             │   }                            │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Omit(           │ type T = Omit<{             │ const T = {                    │
│   Type.Object({                │   x: number,                │   type: 'object',              │
│     x: Type.Number(),          │   y: number                 │   required: ['y'],             │
│     y: Type.Number()           │ }, 'x'>                     │   properties: {                │
│   }), ['x']                    |                             │     y: {                       │
│ )                              │                             │       type: 'number'           │
│                                │                             │     }                          │
│                                │                             │   }                            │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Index(          │ type T = {                  │ const T = {                    │
│   Type.Object({                │   x: number,                │   type: 'number'               │
│     x: Type.Number(),          │   y: string                 │ }                              │
│     y: Type.String()           │ }['x']                      │                                │
│   }), ['x']                    │                             │                                │
│ )                              │                             │                                │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const A = Type.Tuple([         │ type A = [0, 1]             │ const T = {                    │
│   Type.Literal(0),             │ type B = [2, 3]             │   type: 'array',               │
│   Type.Literal(1)              │ type T = [                  │   items: [                     │
│ ])                             │   ...A,                     │     { const: 0 },              │
│ const B = Type.Tuple([         │   ...B                      │     { const: 1 },              │
|   Type.Literal(2),             │ ]                           │     { const: 2 },              │
|   Type.Literal(3)              │                             │     { const: 3 }               │
│ ])                             │                             │   ],                           │
│ const T = Type.Tuple([         │                             │   additionalItems: false,      │
|   ...Type.Rest(A),             │                             │   minItems: 4,                 │
|   ...Type.Rest(B)              │                             │   maxItems: 4                  │
│ ])                             │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Uncapitalize(   │ type T = Uncapitalize<      │ const T = {                    │
│   Type.Literal('Hello')        │   'Hello'                   │   type: 'string',              │
│ )                              │ >                           │   const: 'hello'               │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Capitalize(     │ type T = Capitalize<        │ const T = {                    │
│   Type.Literal('hello')        │   'hello'                   │   type: 'string',              │
│ )                              │ >                           │   const: 'Hello'               │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Uppercase(      │ type T = Uppercase<         │ const T = {                    │
│   Type.Literal('hello')        │   'hello'                   │   type: 'string',              │
│ )                              │ >                           │   const: 'HELLO'               │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Lowercase(      │ type T = Lowercase<         │ const T = {                    │
│   Type.Literal('HELLO')        │   'HELLO'                   │   type: 'string',              │
│ )                              │ >                           │   const: 'hello'               │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const R = Type.Ref('T')        │ type R = unknown            │ const R = { $ref: 'T' }        │
│                                │                             │                                │
└────────────────────────────────┴─────────────────────────────┴────────────────────────────────┘