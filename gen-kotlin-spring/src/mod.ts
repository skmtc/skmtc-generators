import { toGeneratorEnrichment, toOasOperationEntry } from '@skmtc/core'
import { ensureApiErrorSupport } from './apiErrorSupport.ts'
import { ensureTagApi } from './ensureTagApi.ts'
import { generatorConfigSchema, toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * The gen-kotlin-spring operation entry. Per tag, ONE generated file holding
 * TWO declarations: `interface <Tag>Service` (DTO-typed, zero Spring
 * imports) and `@RestController class <Tag>Controller` (all web plumbing,
 * complete expression-bodied delegation into the injected service). The
 * consumer implements the interface as a Spring bean
 * (`@Service class DefaultUsersService : UsersService`) — pure business
 * logic, no web layer; Spring DI checks the wiring at startup.
 *
 * Untagged operations land in `DefaultApi`; a multi-tag operation joins its
 * FIRST tag only. Non-200 success codes render `@ResponseStatus`.
 *
 * With the `emitServiceImplementations` enrichment on, a
 * `Default<Tag>Service.generated.kt` scaffold is written beside each tag
 * file — every method throwing 501 — as a starting point for the
 * hand-written half. Eject it before writing logic into it.
 *
 * Config (`basePackage`) is read from the `generator` enrichment scope
 * (`client.json#enrichments[id]._generator`), not constructor options — so
 * the generator runs CLI-only and carries no module state.
 */
export default toOasOperationEntry<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,
  transform({ context, operation }) {
    const config = toGeneratorEnrichment(context, denoJson.name, generatorConfigSchema)

    // Once per run (the error channel) and once per tag (its declarations) —
    // both deduplicated by the cache, so every operation asks for them and
    // only the first creates them.
    ensureApiErrorSupport(context, config.basePackage)

    ensureTagApi({ context, operation, config }).add(operation)
  }
})
