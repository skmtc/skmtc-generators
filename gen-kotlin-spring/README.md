# @skmtc/gen-kotlin-spring

Spring Boot server code from OpenAPI `paths` — per tag, ONE generated
file holding a `@RestController` with complete delegating bodies and
the `<Tag>Service` interface the consumer implements. Generated output
is complete, never a stub; business logic lives behind the service
seam in hand-written code.

```kotlin
interface UsersService {
    fun getUsersId(id: String, verbose: Boolean?): User

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

There is no default entry export — `basePackage` has no safe default:

```ts
import { toKotlinSpringEntry } from 'jsr:@skmtc/gen-kotlin-spring'

export default toKotlinSpringEntry({ basePackage: 'com.example.api' })
```

DTOs come from `@skmtc/gen-kotlin` (peer) — run both on the same
document. Both generators must pin the SAME `@skmtc/lang-kotlin`.

## Error channel (generated)

One `ApiError.generated.kt` per `basePackage`: a `@Serializable data
class ApiError(status, message?)` plus a `@RestControllerAdvice`
mapping Spring's own `ResponseStatusException` to it. ServiceImpls
throw `ResponseStatusException(HttpStatus.NOT_FOUND, "No such user")`
— no custom exception vocabulary. Needed because the Jackson-less
kotlinx setup breaks Spring Boot's default error rendering.

## Enrichments

Per-operation config under
`client.json#settings.enrichments["@skmtc/gen-kotlin-spring"][path][method].main`:

- **`serviceMethodName`** — rename the derived method
  (`getCreditNotesId` → `getCreditNote`); applies to the service
  declaration AND the controller delegation in lockstep.

## Consumer setup (kotlinx end-to-end)

- `spring-boot-starter-web` with `spring-boot-starter-json` EXCLUDED
  (the kotlinx converter serves JSON).
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
  base paths, WebFlux/`suspend`, Jackson flavor.

Specs: `skmtc/notes/lang/25-kotlin-controller-service-architecture.md`
(+ `28` serviceMethodName/KDoc, `29` error channel).
