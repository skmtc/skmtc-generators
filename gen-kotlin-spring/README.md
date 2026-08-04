# @skmtc/gen-kotlin-spring

Spring Boot server code from OpenAPI `paths` — per tag, ONE generated
file holding a `@RestController` with complete delegating bodies and
the `<Tag>Service` interface the consumer implements. Generated output
is complete, never a stub; business logic lives behind the service
seam in hand-written code.

```kotlin
interface UsersService {
    fun getUsersId(id: String, verbose: Boolean? = null): User

    fun postUsers(body: CreateUserBody): User
}

@RestController
class UsersController(
    private val service: UsersService
) {
    @GetMapping("/users/{id}")
    fun getUsersId(@PathVariable("id") id: String, @RequestParam("verbose") verbose: Boolean?): User = service.getUsersId(id, verbose)

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    fun postUsers(@RequestBody body: CreateUserBody): User = service.postUsers(body)
}
```

The consumer writes one class per tag — pure logic, no web concerns:

```kotlin
@Service
class UsersServiceImpl : UsersService { ... }
```

## Usage

The default export IS the entry — there are no constructor options.
Everything configurable rides the enrichment channel (see below), so
the generator runs CLI-only and carries no module state.

DTOs come from `@skmtc/gen-kotlin-jackson` (peer). You do NOT have to
register its transform: spring emits DTO types through the peer's
exported router either way, so a spring-only stack still produces
them. Registering it as well adds the schemas no operation references.
Both generators must pin the SAME `@skmtc/lang-kotlin`.

## Error channel (generated)

One `ApiError.generated.kt` per `basePackage`: a plain
`data class ApiError(status, message?)` — Jackson binds it natively,
no serialization annotation needed — plus a `@RestControllerAdvice`
mapping Spring's own `ResponseStatusException` to it. ServiceImpls
throw `ResponseStatusException(HttpStatus.NOT_FOUND, "No such user")`
— no custom exception vocabulary. The advice exists to keep the error
shape stable and documented rather than whatever Spring Boot's default
error rendering emits.

## Enrichments

**Two `basePackage` values are REQUIRED**, both in the `_generator`
scope, neither with a default — a placeholder package must never ship
into consumer code:

```jsonc
// client.json#settings.enrichments
{
  "@skmtc/gen-kotlin-spring":  { "_generator": { "basePackage": "com.acme.orders.api" } },
  // The model peer. Required even when its transform is NOT registered:
  // spring reads it through the peer's router for every DTO type. May
  // equal or differ from the package above.
  "@skmtc/gen-kotlin-jackson": { "_generator": { "basePackage": "com.acme.orders.models" } }
}
```

Omitting the peer's value does not fail the run — it fails the
individual operations whose schemas need a named declaration, and
those endpoints then disappear from an otherwise valid, compiling
`<Tag>Api.generated.kt`. The symptom is
`ValiError: Invalid type: Expected Object but received undefined`
raised from `gen-kotlin-jackson/src/lib.ts`, recorded per subject in
`manifest.results.generate` (NOT in `parseIssues`).

Per-operation config under
`enrichments["@skmtc/gen-kotlin-spring"][path][method].main`:

- **`serviceMethodName`** — rename the derived method
  (`getCreditNotesId` → `getCreditNote`); applies to the service
  declaration AND the controller delegation in lockstep.

## Consumer setup (Jackson end-to-end)

- `spring-boot-starter-web` — keep `spring-boot-starter-json`; Jackson
  is what binds the generated DTOs.
- `com.fasterxml.jackson.module:jackson-module-kotlin`, so Jackson can
  construct Kotlin data classes that have no no-arg constructor. Spring
  Boot registers it automatically once it is on the classpath.
- `kotlin-reflect` on the classpath; the `plugin.spring` Gradle plugin.
- Component-scan the generated `basePackage` AND your ServiceImpls.

## v1 policy

- One file per tag (`UsersApi.generated.kt`); untagged → `Default…`;
  multi-tag → first tag. Method names from method+path.
- Path/query/body binding with explicit wire names; lowest-2xx JSON
  return type; `@ResponseStatus` for 201/202/204. Operation
  `summary`/`description` renders as KDoc on the seam method.
- Optional query/body parameters default to `null` on the SERVICE
  seam only (named-args ergonomics for callers and tests); the
  controller signature stays an exact binding.
- Named exclusions: header/cookie params, non-JSON content,
  multi-status unions, `ResponseEntity<T>`, security annotations,
  base paths, WebFlux/`suspend`, kotlinx-serialization flavor.

Specs: `skmtc/notes/lang/25-kotlin-controller-service-architecture.md`
(+ `28` serviceMethodName/KDoc, `29` error channel).

## Dependencies

The model peer is `@skmtc/gen-kotlin-jackson`, declared in this
package's `deno.json` as a **relative path** (`../gen-kotlin-jackson/mod.ts`)
rather than the exact `jsr:` pin every published peer pair uses
(gen-tanstack-query-fetch-zod → gen-zod, gen-express → gen-valibot):
gen-kotlin-jackson is not yet published, so no pin exists. The release
cascade discovers peer edges from `jsr:` pins in member `imports` — when
jackson publishes, this mapping MUST become an exact pin or the
spring → jackson edge stays invisible to the cascade.
