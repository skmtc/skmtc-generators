# @skmtc/gen-kotlin-spring

Spring Boot server interfaces from OpenAPI `paths` — one annotated
`interface <Tag>Api` per tag (the "interfaceOnly" pattern). The consumer
writes `@RestController class UsersController : UsersApi` and Spring
binds the interface-declared annotations; generated output is complete,
never a stub.

```kotlin
interface UsersApi {
    @GetMapping("/users/{id}")
    fun getUsersId(@PathVariable("id") id: String, @RequestParam("verbose") verbose: Boolean?): User

    @PostMapping("/users")
    fun postUsers(@RequestBody body: CreateUserBody): User
}
```

## Usage

There is no default entry export — `basePackage` has no safe default.
Wrap the factory in your project:

```ts
import { toKotlinSpringEntry } from 'jsr:@skmtc/gen-kotlin-spring'

export default toKotlinSpringEntry({ basePackage: 'com.example.api' })
```

DTO types come from `@skmtc/gen-kotlin` (the peer dependency) — run both
generators on the same document. Same `basePackage` → DTO references
render bare (same-package suppression); different packages → imports
render automatically.

## Consumer setup (kotlinx.serialization end-to-end)

- `spring-boot-starter-web` with `spring-boot-starter-json` EXCLUDED, so
  Spring auto-registers the kotlinx converter
  (`kotlinx-serialization-json` on the classpath).
- `kotlin-reflect` on the classpath (Spring MVC's Kotlin parameter
  handling requires it).
- The `plugin.spring` Gradle plugin.

## v1 policy

- Spring MVC, plain `fun` — no WebFlux/`suspend` (a later sibling).
- Path params → `@PathVariable("wire_name")`, query params →
  `@RequestParam("wire_name")` (optional → nullable type), JSON body →
  `@RequestBody body: T`. Annotations always carry the explicit wire name.
- Return type = the lowest-2xx `application/json` schema; none → implicit
  `Unit`.
- Named exclusions: header/cookie params, non-JSON content types,
  multi-status response unions, `ResponseEntity<T>`, security
  annotations, servers/base-path prefixes.

Spec: `skmtc/notes/lang/23-kotlin-spring-architecture.md`.
