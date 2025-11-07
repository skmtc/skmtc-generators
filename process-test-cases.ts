import { toSchemaV3 } from '@skmtc/core'
import { toZodValue } from './gen-zod/src/Zod.ts'
import type { OpenAPIV3 } from 'openapi-types'
import { toParseContext } from './gen-zod/test/helpers/toParseContext.ts'
import { toGenerateContext } from './gen-zod/test/helpers/toGenerateContext.ts'
import { StackTrail } from '@skmtc/core'

// Helper to convert schema and get Zod string (copied from toZodValue.test.ts)
function schemaToZod(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  required = true
): string {
  const stackTrail = new StackTrail(['TEST'])
  const parsedSchema = toSchemaV3({ schema, context: toParseContext(), stackTrail })

  const result = toZodValue({
    schema: parsedSchema,
    destinationPath: '/test',
    required,
    context: toGenerateContext()
  })

  return result.toString()
}

interface TestCase {
  testCaseName: string
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
}

interface ProcessedTestCase {
  name: string
  input: string
  output: string
}

async function processTestCases() {
  // Read the test cases
  const testCasesJson = await Deno.readTextFile('./test-cases.json')
  const testCases: TestCase[] = JSON.parse(testCasesJson)

  const processedCases: ProcessedTestCase[] = []

  console.log(`Processing ${testCases.length} test cases...`)

  for (const testCase of testCases) {
    console.log(`Processing: ${testCase.testCaseName}`)

    try {
      const zodOutput = schemaToZod(testCase.schema)

      processedCases.push({
        name: testCase.testCaseName,
        input: JSON.stringify(testCase.schema, null, 2),
        output: zodOutput
      })
    } catch (error) {
      console.error(`Error processing ${testCase.testCaseName}:`, error)
      processedCases.push({
        name: testCase.testCaseName,
        input: JSON.stringify(testCase.schema, null, 2),
        output: `ERROR: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  }

  // Generate markdown table
  const markdownLines = [
    '# Test Cases Results',
    '',
    'Generated Zod schemas from JSON Schema test cases.',
    '',
    '| Name | Input | Output |',
    '|------|-------|--------|'
  ]

  for (const processedCase of processedCases) {
    // Escape markdown characters and format for table
    const name = processedCase.name.replace(/\|/g, '\\|')
    const input = processedCase.input.replace(/\|/g, '\\|').replace(/\n/g, '<br>')
    const output = processedCase.output.replace(/\|/g, '\\|')

    markdownLines.push(`| ${name} | <pre>${input}</pre> | \`${output}\` |`)
  }

  const markdownContent = markdownLines.join('\n')

  // Write the markdown file
  await Deno.writeTextFile('./test-cases.md', markdownContent)

  console.log(`✅ Generated test-cases.md with ${processedCases.length} test cases`)
  console.log(`✅ Successful: ${processedCases.filter(c => !c.output.startsWith('ERROR:')).length}`)
  console.log(`❌ Errors: ${processedCases.filter(c => c.output.startsWith('ERROR:')).length}`)
}

if (import.meta.main) {
  await processTestCases()
}
