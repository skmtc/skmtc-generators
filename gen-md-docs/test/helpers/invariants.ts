import { parse as parseYaml } from 'jsr:@std/yaml@^1.0.0'

type Artifacts = Record<string, string>

const markdownDocs = (artifacts: Artifacts): [string, string][] =>
  Object.entries(artifacts).filter(([path]) => path.endsWith('.md'))

/** A GitHub-style heading slug: lower-cased, punctuation dropped, spaces hyphenated. */
const toSlug = (heading: string): string =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .trim()
    .replace(/\s+/g, '-')

/**
 * Every `` [`Type`](#anchor) `` link (the only links the generator emits — the
 * de-duplicated `$ref`s) resolves to a heading in the same document. Ignores
 * plain-text links, which may come from the spec's own descriptions.
 */
export const checkAnchorLinks = (artifacts: Artifacts): string[] => {
  const violations: string[] = []

  for (const [path, content] of markdownDocs(artifacts)) {
    const anchors = new Set([...content.matchAll(/^#{1,6} (.+)$/gm)].map(match => toSlug(match[1])))

    for (const link of content.matchAll(/\[`[^`]+`\]\(#([^)]+)\)/g)) {
      if (!anchors.has(link[1])) {
        violations.push(`${path}: link "#${link[1]}" has no matching heading`)
      }
    }
  }

  return violations
}

/**
 * The index and catalog are internally consistent: `index.json` is valid JSON
 * with one record per operation document, and every link in the top index, each
 * per-tag index, and the catalog points to an artifact that was emitted.
 */
export const checkIndexIntegrity = (artifacts: Artifacts): string[] => {
  const violations: string[] = []
  const has = (path: string): boolean => Object.hasOwn(artifacts, path)

  const topIndexKey = Object.keys(artifacts).find(path => path.endsWith('docs/index.md'))

  if (topIndexKey === undefined) {
    return ['no top index (docs/index.md) emitted']
  }

  // `<base>/docs/`
  const docsPrefix = topIndexKey.slice(0, topIndexKey.length - 'index.md'.length)
  const catalogKey = `${docsPrefix}index.json`

  const opDocs = Object.keys(artifacts).filter(
    path => path.startsWith(docsPrefix) && path.endsWith('.md') && !path.endsWith('/index.md')
  )

  if (!has(catalogKey)) {
    violations.push('no catalog (docs/index.json) emitted')
  } else {
    try {
      const catalog = JSON.parse(artifacts[catalogKey])

      if (catalog.operations.length !== opDocs.length) {
        violations.push(
          `catalog lists ${catalog.operations.length} operations but ${opDocs.length} operation docs exist`
        )
      }

      for (const operation of catalog.operations) {
        if (!has(`${docsPrefix}${operation.file}`)) {
          violations.push(`catalog references "${operation.file}", which was not emitted`)
        }
      }
    } catch (error) {
      violations.push(`catalog is not valid JSON: ${error instanceof Error ? error.message : error}`)
    }
  }

  for (const [path, content] of Object.entries(artifacts)) {
    if (!path.endsWith('/index.md')) {
      continue
    }

    const dir = path.slice(0, path.lastIndexOf('/') + 1)

    for (const link of content.matchAll(/\]\(([^)#]+)\)/g)) {
      const target = link[1]

      if (target.startsWith('http')) {
        continue
      }

      if (!has(`${dir}${target}`)) {
        violations.push(`${path}: link "${target}" points at a file that was not emitted`)
      }
    }
  }

  return violations
}

/** Every operation document opens with frontmatter that parses as YAML and carries the core keys. */
export const checkFrontmatter = (artifacts: Artifacts): string[] => {
  const violations: string[] = []

  for (const [path, content] of markdownDocs(artifacts)) {
    if (!content.startsWith('---\n')) {
      continue
    }

    const end = content.indexOf('\n---', 4)

    if (end === -1) {
      violations.push(`${path}: unterminated frontmatter`)
      continue
    }

    try {
      const frontmatter = parseYaml(content.slice(4, end))

      if (typeof frontmatter !== 'object' || frontmatter === null) {
        violations.push(`${path}: frontmatter is not a mapping`)
        continue
      }

      for (const key of ['type', 'method', 'path']) {
        if (!(key in frontmatter)) {
          violations.push(`${path}: frontmatter missing "${key}"`)
        }
      }
    } catch (error) {
      violations.push(`${path}: frontmatter is not valid YAML: ${error instanceof Error ? error.message : error}`)
    }
  }

  return violations
}

/** Every fenced ```json example block parses as JSON. */
export const checkJsonExamples = (artifacts: Artifacts): string[] => {
  const violations: string[] = []

  for (const [path, content] of markdownDocs(artifacts)) {
    for (const block of content.matchAll(/```json\n([\s\S]*?)\n```/g)) {
      try {
        JSON.parse(block[1])
      } catch (error) {
        violations.push(`${path}: invalid JSON example: ${error instanceof Error ? error.message : error}`)
      }
    }
  }

  return violations
}

/** Every document has balanced code fences. */
export const checkCodeFences = (artifacts: Artifacts): string[] =>
  markdownDocs(artifacts).flatMap(([path, content]) => {
    const fences = (content.match(/```/g) ?? []).length

    return fences % 2 === 0 ? [] : [`${path}: unbalanced code fences (${fences})`]
  })

/** Run every structural invariant, returning all violations (empty = pass). */
export const checkAll = (artifacts: Artifacts): string[] => [
  ...checkAnchorLinks(artifacts),
  ...checkIndexIntegrity(artifacts),
  ...checkFrontmatter(artifacts),
  ...checkJsonExamples(artifacts),
  ...checkCodeFences(artifacts)
]
