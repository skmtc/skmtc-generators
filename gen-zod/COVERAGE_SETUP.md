# Coverage Setup Template

This document explains how to replicate the coverage setup for other generators in the Skmtc ecosystem.

## What's Included

Each generator gets its own **project-specific** coverage tracking:
- Individual coverage badge per generator
- Separate GitHub Pages deployment paths
- Project-scoped coverage reports (only includes files from that generator)

## Files Created

1. **`deno.json`** - Added coverage tasks
2. **`.github/workflows/coverage.yml`** - GitHub Actions workflow
3. **`coverage.ts`** - Local coverage script
4. **`.gitignore`** - Coverage directory exclusions
5. **`README.md`** - Badge and documentation

## For Other Generators

To replicate this setup for another generator (e.g., `gen-typescript`):

### 1. Update deno.json
Add these tasks:
```json
{
  "tasks": {
    "test:coverage": "deno test --allow-env --allow-sys --allow-read --coverage=coverage",
    "coverage:report": "deno coverage coverage --lcov --output=coverage.lcov",
    "coverage:html": "deno coverage coverage --html",
    "coverage:check": "deno coverage coverage --detailed"
  }
}
```

### 2. Copy coverage.yml workflow
Change the badge directory in the workflow:
```yaml
# Create project-specific badge directory
mkdir -p badges/gen-typescript  # <-- Change this

# Generate badge SVG using shields.io
curl -s "https://img.shields.io/badge/coverage-${COVERAGE}%25-${COLOR}" > badges/gen-typescript/coverage.svg  # <-- And this
```

### 3. Update README badge URL
```markdown
![Coverage](https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/gh-pages/badges/gen-typescript/coverage.svg)
```

### 4. Copy coverage.ts script
No changes needed - it's generator-agnostic.

### 5. Copy .gitignore
No changes needed.

## Benefits

- **Independent tracking**: Each generator has its own coverage metrics
- **No interference**: One generator's tests don't affect another's coverage
- **Clear accountability**: Easy to see which generators need more test coverage
- **Parallel development**: Teams can work on different generators without coverage conflicts

## Badge Locations

When deployed, badges will be available at:
- `gh-pages/badges/gen-zod/coverage.svg`
- `gh-pages/badges/gen-typescript/coverage.svg`
- `gh-pages/badges/gen-msw/coverage.svg`
- etc.

This ensures each generator's README displays its own accurate coverage percentage.