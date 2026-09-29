# @skmtc/gen-fetch

One typed `fetch` function per OpenAPI operation. The arguments are typed with
[`@skmtc/gen-typescript`](https://jsr.io/@skmtc/gen-typescript), and the
success response is checked with a
[`@skmtc/gen-zod`](https://jsr.io/@skmtc/gen-zod) schema. When the API returns
something the document does not describe, the zod error names the field.

```ts
export const getApiV2Price = async (args: GetApiV2PriceArgs = {}, options: GetApiV2PriceOptions = {}) => {
  const { baseUrl = "https://api.energy-charts.info", fetch: fetchFn = fetch } = options
  // …path, query, header and cookie parameters, auth, body…
  if (!res.ok) throw new ApiError(res.status, await res.text())

  return timeSeriesResponseV2.parse(await res.json())
}
```

## What the function does

- **Arguments.** One `args` object holds every path, query, header and cookie
  parameter by its name in the document, plus `body`. A JSON or url-encoded
  body is typed from its schema. Any other media type takes `BodyInit`.
- **Options.** `baseUrl` defaults to the first server of the operation or the
  document, with server variables set to their defaults. When no absolute
  server URL is declared, `baseUrl` is required. `fetch` replaces the global
  fetch.
- **Auth.** The first security requirement becomes options: `apiKey` (header,
  query or cookie), `token` (HTTP bearer, OAuth 2, OpenID Connect, other HTTP
  schemes) or `username` and `password` (HTTP basic). The JSDoc names the other
  requirements.
- **Response.** The lowest 2xx response is read. JSON goes through the zod
  schema, `text/*` returns a string, other media types return a `Blob`, and no
  content returns `undefined`. A non-2xx response throws `ApiError` with
  `status` and `body`.

## Settings

All are generator-level (`_generator` in `client.json`):

| Setting | Effect |
| --- | --- |
| `exportPath` | Write every operation to this file, in place of `@/fetch/<name>.generated.ts` |
| `baseUrl` | The default base URL. Wins over the document's `servers` |
| `docsUrl` | A link written into each function's JSDoc |

`@skmtc/gen-zod` and `@skmtc/gen-typescript` take the same `exportPath`
setting. Give all three the same path to get one self-contained file whose
only import is `zod`:

```json
{
  "settings": {
    "enrichments": {
      "@skmtc/gen-typescript": { "_generator": { "exportPath": "@/operation.ts" } },
      "@skmtc/gen-zod": { "_generator": { "exportPath": "@/operation.ts" } },
      "@skmtc/gen-fetch": { "_generator": { "exportPath": "@/operation.ts" } }
    }
  }
}
```

The error class is `ApiError`, unless a schema in the document already takes
that name. It is then `ApiError2`, or the next free number.

## Tests

- `deno task test`: the generated file's structure.
- `deno task test:typecheck`: compiles the output against zod and calls it with
  a stub fetch.
- `deno run -A test/real-operations.ts <out-dir>`: generates real operations
  from skmtc.dev and checks each file with `deno check`. This one needs the
  network.
