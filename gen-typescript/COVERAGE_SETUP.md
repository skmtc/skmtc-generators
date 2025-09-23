# Coverage Setup for gen-typescript

This document explains the coverage setup implemented for gen-typescript.

## Current Coverage

**98% overall coverage** with excellent metrics:
- **Lines**: 98% (486/496)
- **Functions**: 98.3% (57/58)
- **Branches**: 96.7% (29/30)

## Files Added

1. **`deno.json`** - Added coverage tasks
2. **`.github/workflows/coverage.yml`** - GitHub Actions workflow
3. **`coverage.ts`** - Local coverage script
4. **`.gitignore`** - Coverage directory exclusions
5. **`README.md`** - Badge and comprehensive documentation

## Coverage Commands

```bash
# Run tests with coverage
deno task test:coverage

# Generate LCOV report
deno task coverage:report

# View detailed coverage
deno task coverage:check

# Generate HTML coverage report
deno task coverage:html

# Local coverage script with report
deno run --allow-read --allow-write --allow-run coverage.ts
```

## Project-Specific Coverage

The coverage is **project-specific** and only includes:
- Files from `gen-typescript/src/**`
- No interference from other generators
- Independent badge at: `gh-pages/badges/gen-typescript/coverage.svg`

## Badge Location

The coverage badge will be available at:
```
https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/gh-pages/badges/gen-typescript/coverage.svg
```

## GitHub Actions

The workflow automatically:
- Runs tests with coverage on push/PR
- Generates LCOV report and extracts coverage percentage
- Creates a dynamic coverage badge
- Deploys badge to GitHub Pages
- Comments coverage results on pull requests

This ensures the README always displays current, accurate coverage metrics for gen-typescript specifically.