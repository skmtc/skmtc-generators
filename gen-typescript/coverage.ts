#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run

/**
 * Local coverage report generator for gen-typescript
 *
 * This script:
 * 1. Runs tests with coverage collection
 * 2. Generates LCOV report
 * 3. Parses coverage percentage
 * 4. Optionally updates README with current coverage
 *
 * Usage:
 *   deno run --allow-read --allow-write --allow-run coverage.ts
 *   deno run --allow-read --allow-write --allow-run coverage.ts --update-readme
 */

interface CoverageStats {
  linesFound: number
  linesHit: number
  functionsFound: number
  functionsHit: number
  branchesFound: number
  branchesHit: number
}

async function runCommand(cmd: string[]): Promise<string> {
  const process = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    stdout: "piped",
    stderr: "piped",
  })

  const { code, stdout, stderr } = await process.output()

  if (code !== 0) {
    const errorText = new TextDecoder().decode(stderr)
    throw new Error(`Command failed: ${cmd.join(' ')}\n${errorText}`)
  }

  return new TextDecoder().decode(stdout)
}

async function parseLcovFile(filePath: string): Promise<CoverageStats> {
  try {
    const content = await Deno.readTextFile(filePath)
    const lines = content.split('\n')

    let linesFound = 0
    let linesHit = 0
    let functionsFound = 0
    let functionsHit = 0
    let branchesFound = 0
    let branchesHit = 0

    for (const line of lines) {
      if (line.startsWith('LF:')) {
        linesFound += parseInt(line.split(':')[1] || '0')
      } else if (line.startsWith('LH:')) {
        linesHit += parseInt(line.split(':')[1] || '0')
      } else if (line.startsWith('FNF:')) {
        functionsFound += parseInt(line.split(':')[1] || '0')
      } else if (line.startsWith('FNH:')) {
        functionsHit += parseInt(line.split(':')[1] || '0')
      } else if (line.startsWith('BRF:')) {
        branchesFound += parseInt(line.split(':')[1] || '0')
      } else if (line.startsWith('BRH:')) {
        branchesHit += parseInt(line.split(':')[1] || '0')
      }
    }

    return {
      linesFound,
      linesHit,
      functionsFound,
      functionsHit,
      branchesFound,
      branchesHit,
    }
  } catch (error) {
    throw new Error(`Failed to parse LCOV file: ${error.message}`)
  }
}

function calculatePercentage(hit: number, found: number): number {
  return found > 0 ? Math.round((hit / found) * 100 * 10) / 10 : 0
}

function formatCoverageReport(stats: CoverageStats): string {
  const linePercent = calculatePercentage(stats.linesHit, stats.linesFound)
  const functionPercent = calculatePercentage(stats.functionsHit, stats.functionsFound)
  const branchPercent = calculatePercentage(stats.branchesHit, stats.branchesFound)

  return `
📊 Coverage Report (gen-typescript)
===================================
Lines:     ${linePercent}% (${stats.linesHit}/${stats.linesFound})
Functions: ${functionPercent}% (${stats.functionsHit}/${stats.functionsFound})
Branches:  ${branchPercent}% (${stats.branchesHit}/${stats.branchesFound})

Overall:   ${linePercent}%
`
}

async function updateReadmeWithCoverage(coverage: number): Promise<void> {
  try {
    const readmePath = './README.md'
    let content = await Deno.readTextFile(readmePath)

    // Update the badge URL with actual repository info if it's still placeholder
    if (content.includes('YOUR_USERNAME/YOUR_REPO')) {
      console.log('⚠️  Please update the badge URL in README.md with your actual repository information')
    }

    // Add a coverage comment that can be updated
    const coverageComment = `<!-- COVERAGE:${coverage}% -->`

    if (content.includes('<!-- COVERAGE:')) {
      // Update existing coverage comment
      content = content.replace(/<!-- COVERAGE:[\d.]+% -->/, coverageComment)
    } else {
      // Add coverage comment after the coverage badge
      content = content.replace(
        /!\[Coverage\]\([^)]+\)/,
        `$&\n${coverageComment}`
      )
    }

    await Deno.writeTextFile(readmePath, content)
    console.log(`✅ Updated README.md with ${coverage}% coverage`)
  } catch (error) {
    console.error(`❌ Failed to update README: ${error.message}`)
  }
}

async function main() {
  const args = Deno.args
  const updateReadme = args.includes('--update-readme')

  try {
    console.log('🧪 Running tests with coverage...')
    await runCommand(['deno', 'task', 'test:coverage'])

    console.log('📋 Generating LCOV report...')
    await runCommand(['deno', 'task', 'coverage:report'])

    console.log('📊 Parsing coverage data...')
    const stats = await parseLcovFile('./coverage.lcov')
    const overallCoverage = calculatePercentage(stats.linesHit, stats.linesFound)

    console.log(formatCoverageReport(stats))

    if (updateReadme) {
      await updateReadmeWithCoverage(overallCoverage)
    }

    // Provide helpful suggestions
    if (overallCoverage < 80) {
      console.log('💡 Consider adding more tests to improve coverage')
    } else {
      console.log('🎉 Great test coverage!')
    }

  } catch (error) {
    console.error(`❌ Error: ${error.message}`)
    Deno.exit(1)
  }
}

if (import.meta.main) {
  await main()
}