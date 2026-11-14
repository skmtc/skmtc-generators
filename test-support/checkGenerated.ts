// deno-lint-ignore-file skmtc/runtime-discipline -- test code, never run by the worker: it writes a run's artifacts to disk and runs deno over them
import { dirname, join } from '@std/path'

type CheckGeneratedArgs = {
  /** A run's artifacts, keyed by path under `basePath: './src'`. */
  artifacts: Record<string, string>
  /** What the emitted files import besides `@/`, e.g. `{ zod: 'npm:zod@4.6.7' }`. */
  imports: Record<string, string>
}

const runDeno = async (args: string[]): Promise<{ code: number; output: string }> => {
  const { code, stdout, stderr } = await new Deno.Command('deno', {
    args,
    env: { NO_COLOR: '1' },
    stdout: 'piped',
    stderr: 'piped'
  }).output()

  const decoder = new TextDecoder()

  return { code, output: `${decoder.decode(stdout)}${decoder.decode(stderr)}` }
}

/**
 * Write a run's artifacts to a project of their own, type-check them, then
 * load each file first, in a process of its own: a module of a cycle that
 * reads another model before that model's module has run throws there.
 * Returns what failed, so a passing run is `[]`.
 *
 * Needs write, `run=deno` and net, which the default test tasks do not
 * grant: call it from a `test:typecheck` task.
 */
export const checkGenerated = async ({ artifacts, imports }: CheckGeneratedArgs): Promise<string[]> => {
  const root = await Deno.makeTempDir({ prefix: 'skmtc-generated-' })

  try {
    const config = join(root, 'deno.json')
    const paths = Object.keys(artifacts).toSorted()

    await Deno.writeTextFile(config, JSON.stringify({ imports: { '@/': './src/', ...imports } }))

    for (const path of paths) {
      const target = join(root, path)
      await Deno.mkdir(dirname(target), { recursive: true })
      await Deno.writeTextFile(target, artifacts[path])
    }

    const check = await runDeno(['check', '--quiet', '--config', config, ...paths.map(path => join(root, path))])

    const failures = check.code === 0 ? [] : [`deno check failed:\n${check.output}`]

    // One process at a time: a few seconds slower, and no run of dozens of
    // processes that compete for the npm cache and the runner's memory.
    for (const path of paths) {
      const load = await runDeno(['run', '--quiet', '--no-check', '--config', config, join(root, path)])

      if (load.code !== 0) {
        failures.push(`loading ${path} first failed:\n${load.output}`)
      }
    }

    return failures
  } finally {
    await Deno.remove(root, { recursive: true })
  }
}
