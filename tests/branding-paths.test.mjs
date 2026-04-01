import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

test('package metadata uses xccodex branding', () => {
  const pkg = JSON.parse(
    fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  )
  assert.equal(pkg.name, 'xccodex')
  assert.deepEqual(pkg.bin, {
    xccodex: 'dist/xccodex.js',
  })
})

test('launcher uses branded config paths and env vars', () => {
  const launcherPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    'scripts',
    'run-recovered-cli.mjs',
  )
  const launcherSource = fs.readFileSync(launcherPath, 'utf8')

  assert.match(
    launcherSource,
    /path\.join\(os\.homedir\(\), '\.xccode', 'settings\.json'\)/,
  )
  assert.match(launcherSource, /XCCODE_CONFIG_DIR/)
})

test('launcher falls back to legacy global settings env path', () => {
  const launcherPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    'scripts',
    'run-recovered-cli.mjs',
  )
  const launcherSource = fs.readFileSync(launcherPath, 'utf8')

  assert.match(
    launcherSource,
    /path\.join\(os\.homedir\(\), '\.claude', 'settings\.json'\)/,
  )
})
