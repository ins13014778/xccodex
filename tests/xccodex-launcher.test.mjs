import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { transformSync } from 'esbuild'

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

function readSource(relativePath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), 'utf8')
}

function stripImports(source) {
  return source.replace(/^import[\s\S]*?from ['"][^'"]+['"]\r?\n/gm, '')
}

function loadTsModule(relativePath, injectedBindings = {}) {
  const source = stripImports(readSource(relativePath))
  const { code } = transformSync(source, {
    loader: 'ts',
    format: 'cjs',
    target: 'node18',
  })
  const module = { exports: {} }
  const bindingNames = ['module', 'exports', ...Object.keys(injectedBindings)]
  const bindingValues = [
    module,
    module.exports,
    ...Object.values(injectedBindings),
  ]
  const evaluateModule = new Function(...bindingNames, code)
  evaluateModule(...bindingValues)
  return module.exports
}

test('package.json exposes xccodex bin and files whitelist includes dist/xccodex.js', () => {
  const pkg = JSON.parse(readSource('package.json'))
  assert.equal(pkg.bin.xccodex, 'dist/xccodex.js')
  assert.ok(pkg.files.includes('dist/xccodex.js'))
})

test('build.mjs builds cli and xccodex entrypoints', () => {
  const source = readSource('scripts/build.mjs')
  assert.match(source, /xccodex:\s*'src\/entrypoints\/xccodex\.ts'/)
  assert.match(source, /cli:\s*'src\/entrypoints\/cli\.tsx'/)
})

test('provider core exposes completeness and recommended models for novice launcher', () => {
  const core = loadTsModule('src/commands/provider/providerCore.ts', {
    parseArguments: args => args.split(/\s+/).filter(Boolean),
    applyConfigEnvironmentVariables: () => {},
    applyProviderProtocolEnvAliases: () => {},
    updateSettingsForSource: () => ({ error: null }),
    getSettingsForSource: () => null,
  })

  assert.equal(
    core.isProviderConfigComplete({
      protocol: 'openai-compatible',
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: 'k',
      model: 'deepseek-chat',
    }),
    true,
  )
  assert.equal(
    core.isProviderConfigComplete({
      protocol: 'openai-compatible',
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: 'k',
    }),
    false,
  )
  assert.deepEqual(core.getRecommendedModels('openai-compatible'), [
    'deepseek-chat',
    'glm-4.5',
    'qwen-plus',
    'gpt-4.1-mini',
  ])
})

test('xccodex entrypoint exists and contains one-click setup flow', () => {
  const source = readSource('src/entrypoints/xccodex.ts')
  assert.match(source, /runWizard/)
  assert.match(source, /getSavedUserProviderConfig/)
  assert.match(source, /isProviderConfigComplete/)
  assert.match(source, /launchXccode/)
  assert.match(source, /Configuration saved\. Launching xccode/)
})
