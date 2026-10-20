/**
 * A full Parse → Generate → Render run over a shared fixture. Artifact keys and
 * import text are where a host-specific path separator shows (an OS-aware
 * `join` spelled `@/types/x.ts` as `@\types\x.ts` on Windows), so they are
 * pinned here and run on both the Linux and the Windows runner.
 */
import { assertEquals } from '@std/assert'
import { operationDocument, queryDocument, runE2eFixture } from '@skmtc/test-support'
import { expressEntry } from '../src/mod.ts'

const { artifacts } = runE2eFixture({
  id: '@skmtc/gen-express',
  entry: expressEntry,
  document: operationDocument
})

Deno.test('e2e - artifact keys are forward-slash paths under basePath', () => {
  assertEquals(Object.keys(artifacts).sort(), [
    'src/types/newUser.generated.ts',
    'src/users/routes.generated.ts'
  ])
})

Deno.test('e2e - the routes file imports parse and name workspace paths with forward slashes', () => {
  const header = artifacts['src/users/routes.generated.ts'].split('\n\n')[0]

  assertEquals(header.split('\n'), [
    "import {Router, Request, Response, NextFunction} from 'express'",
    "import {getUsersService, postUsersService} from '@/users/services.ts'",
    "import {newUser} from '@/types/newUser.generated.ts'",
    "import * as v from 'valibot'"
  ])
})

Deno.test('e2e - a 3.2 query operation gives no artifact and no error', () => {
  const { artifacts, manifest } = runE2eFixture({
    id: '@skmtc/gen-express',
    entry: expressEntry,
    document: queryDocument
  })

  assertEquals(Object.keys(artifacts), [])
  assertEquals(manifest.parseIssues.filter(issue => issue.level === 'error'), [])
  assertEquals(JSON.stringify(manifest.results).includes('"error"'), false)
})
