# @skmtc/gen-effect-http

OpenAPI to [Effect](https://effect.website) 4 HTTP client generator for
[Skmtc](https://skm.tc).

Writes one function per operation to
`@/client-effect/<endpointName>.generated.ts`, plus a barrel at
`@/client-effect/index.generated.ts`. Names come from method and path, never
`operationId`: `POST /search` is `createApiSearch`.

## What it renders

Each operation becomes
`(params, body) => Effect<…, HttpClientError | SchemaError, HttpClient>`:

- the request is built with `HttpClientRequest`: path parameters interpolated,
  query parameters set with `setUrlParams`, headers with `setHeaders`, and a
  JSON body encoded with the body schema;
- the response is decoded with the response schema, or only executed when the
  operation has no response body;
- the params, body and response schemas are written to the same file, and a
  `$ref` is imported from
  [`@skmtc/gen-effect-schema`](https://jsr.io/@skmtc/gen-effect-schema).

The function knows nothing about transport. The caller provides the `HttpClient`
layer, which is where the base URL, authentication and status handling
(`HttpClient.filterStatusOk`) live.

`get`, `post`, `put`, `patch` and `delete` are supported. To generate only the
operations you call, scope a large document with `client.json#settings.include`.

## Customizing

Output paths are fixed in `src/base.ts`. To write elsewhere, clone the generator
(`skmtc clone`) and edit `toExportPath`.
