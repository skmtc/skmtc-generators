/**
 * SLOT(library): the emitted framework, in one place.
 *
 * Home of Spring's package names. Declared in a leaf module (the
 * gen-kotlin-jackson `lib.ts` convention) so the consumers — the method
 * builder, the interface/controller values, the implementation
 * scaffold, and the error channel — never risk a load-time cycle
 * through the package's largest module.
 */
export const WEB_BIND_ANNOTATION_PACKAGE = 'org.springframework.web.bind.annotation'

/** Home of `HttpStatus` and `ResponseEntity`. */
export const HTTP_PACKAGE = 'org.springframework.http'

/** Home of `ResponseStatusException` — the error channel's input. */
export const WEB_SERVER_PACKAGE = 'org.springframework.web.server'

/** Home of `@Service`, the bean annotation on a generated implementation. */
export const STEREOTYPE_PACKAGE = 'org.springframework.stereotype'
