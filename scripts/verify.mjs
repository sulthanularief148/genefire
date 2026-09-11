#!/usr/bin/env node
/**
 * npm run verify — the acceptance harness, end to end, with no browser extension
 * and no MCP in the loop.
 *
 *   1. production build with NEXT_PUBLIC_VERIFY=1 so the scene exposes its
 *      inspection handles under production semantics
 *   2. playwright starts `next start`, runs the suite, and tears the server down
 *
 * Why a production build and not `next dev`: dev runs React StrictMode, which
 * double-mounts effects and can double-register ScrollTriggers. A suite run
 * there would be measuring an artefact of the dev server, and the pin arithmetic
 * is precisely the thing that artefact would corrupt.
 *
 * A wrapper script rather than an inline env assignment in package.json, because
 * `FOO=1 next build` is not portable to a Windows shell.
 */
import { spawn } from 'node:child_process'

const env = { ...process.env, NEXT_PUBLIC_VERIFY: '1' }

function run(command, args, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n── ${label} ───────────────────────────────────────────\n`)
    const child = spawn(command, args, { stdio: 'inherit', shell: true, env })
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${label} exited ${code}`))))
    child.on('error', reject)
  })
}

try {
  await run('npm', ['run', 'build'], 'production build (NEXT_PUBLIC_VERIFY=1)')
  await run(
    'npx',
    ['playwright', 'test', '--config', 'tests/acceptance/playwright.config.ts', ...process.argv.slice(2)],
    'acceptance suite',
  )
  console.log('\nverify — all acceptance checks completed.\n')
} catch (error) {
  console.error(`\nverify — ${error.message}\n`)
  process.exitCode = 1
}
