import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

/**
 * Repo root, found by walking up from the current directory to the nearest
 * package.json.
 *
 * Not `import.meta.url`: Playwright transpiles a TypeScript config to CommonJS
 * before requiring it, so import.meta is not available and the config fails to
 * load with "exports is not defined". Not a bare process.cwd() either, so the
 * suite behaves the same whether it is launched from the repo root or from
 * tests/acceptance.
 */
function findRepoRoot(start: string): string {
  let dir = resolve(start)
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, 'package.json'))) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return resolve(start)
}

export const REPO_ROOT = findRepoRoot(process.cwd())
