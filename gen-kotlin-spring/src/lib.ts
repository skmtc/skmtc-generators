/**
 * SLOT(library): the emitted framework, in one place.
 *
 * Home of Spring's request-mapping and binding annotations. Declared in
 * a leaf module (the gen-kotlin-jackson `lib.ts` convention) so the
 * three consumers — the method builder, the interface/controller
 * values, and the error channel — never risk a load-time cycle through
 * the package's largest module.
 */
export const WEB_BIND_ANNOTATION_PACKAGE = 'org.springframework.web.bind.annotation'
