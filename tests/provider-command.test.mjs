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

test('provider command files exist and command is registered', () => {
  assert.equal(
    fs.existsSync(path.join(PROJECT_ROOT, 'src', 'commands', 'provider', 'index.ts')),
    true,
  )
  assert.equal(
    fs.existsSync(path.join(PROJECT_ROOT, 'src', 'commands', 'provider', 'provider.tsx')),
    true,
  )
  assert.equal(
    fs.existsSync(path.join(PROJECT_ROOT, 'src', 'commands', 'provider', 'providerCore.ts')),
    true,
  )
  assert.match(readSource('src/commands.ts'), /provider/)
})

test('provider core parses direct set arguments and masks secrets', () => {
  const core = loadTsModule('src/commands/provider/providerCore.ts', {
    parseArguments: args => args.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(s => s.replace(/^"|"$/g, '')) ?? [],
    applyConfigEnvironmentVariables: () => {},
    applyProviderProtocolEnvAliases: () => {},
    updateSettingsForSource: () => ({ error: null }),
    getSettingsForSource: () => null,
  })

  const parsed = core.parseProviderCommandArgs(
    'set --protocol openai-compatible --base-url https://api.deepseek.com/v1 --api-key secret-1234 --model deepseek-chat',
  )

  assert.equal(parsed.action, 'set')
  assert.deepEqual(parsed.values, {
    protocol: 'openai-compatible',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: 'secret-1234',
    model: 'deepseek-chat',
  })
  assert.equal(core.maskProviderSecret('secret-1234'), 'se****34')
})

test('provider env bridge maps anthropic-compatible into ANTHROPIC_* env vars', () => {
  const managedEnv = loadTsModule('src/utils/managedEnv.ts', {
    isRemoteManagedSettingsEligible: () => false,
    clearCACertsCache: () => {},
    getGlobalConfig: () => ({ env: {} }),
    isEnvTruthy: value => ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase()),
    isProviderManagedEnvVar: () => false,
    SAFE_ENV_VARS: new Set(),
    clearMTLSCache: () => {},
    clearProxyCache: () => {},
    configureGlobalAgents: () => {},
    isSettingSourceEnabled: () => true,
    getSettings_DEPRECATED: () => ({ env: {} }),
    getSettingsForSource: () => null,
  })

  const env = {
    XCCODE_PROVIDER_PROTOCOL: 'anthropic-compatible',
    XCCODE_BASE_URL: 'https://anthropic-proxy.example/v1/messages',
    XCCODE_API_KEY: 'anth-key',
    XCCODE_MODEL: 'claude-3-5-sonnet',
  }

  managedEnv.applyProviderProtocolEnvAliases(env)

  assert.equal(env.ANTHROPIC_BASE_URL, 'https://anthropic-proxy.example/v1/messages')
  assert.equal(env.ANTHROPIC_API_KEY, 'anth-key')
  assert.equal(env.ANTHROPIC_MODEL, 'claude-3-5-sonnet')
  assert.equal(env.XCCODE_USE_OPENAI_COMPATIBLE, undefined)
})

test('provider env bridge maps openai-compatible into XCCODE_USE_OPENAI_COMPATIBLE', () => {
  const managedEnv = loadTsModule('src/utils/managedEnv.ts', {
    isRemoteManagedSettingsEligible: () => false,
    clearCACertsCache: () => {},
    getGlobalConfig: () => ({ env: {} }),
    isEnvTruthy: value => ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase()),
    isProviderManagedEnvVar: () => false,
    SAFE_ENV_VARS: new Set(),
    clearMTLSCache: () => {},
    clearProxyCache: () => {},
    configureGlobalAgents: () => {},
    isSettingSourceEnabled: () => true,
    getSettings_DEPRECATED: () => ({ env: {} }),
    getSettingsForSource: () => null,
  })

  const env = {
    XCCODE_PROVIDER_PROTOCOL: 'openai-compatible',
    XCCODE_BASE_URL: 'https://api.deepseek.com/v1',
    XCCODE_API_KEY: 'openai-key',
    XCCODE_MODEL: 'deepseek-chat',
    ANTHROPIC_BASE_URL: 'https://old-anthropic',
    ANTHROPIC_API_KEY: 'old-key',
    ANTHROPIC_MODEL: 'old-model',
  }

  managedEnv.applyProviderProtocolEnvAliases(env)

  assert.equal(env.XCCODE_USE_OPENAI_COMPATIBLE, '1')
  assert.equal(env.ANTHROPIC_BASE_URL, undefined)
  assert.equal(env.ANTHROPIC_API_KEY, undefined)
  assert.equal(env.ANTHROPIC_MODEL, undefined)
})

test('providers.ts recognizes XCCODE_PROVIDER_PROTOCOL', () => {
  const source = readSource('src/utils/model/providers.ts')
  assert.match(source, /XCCODE_PROVIDER_PROTOCOL/)
  assert.match(source, /anthropic-compatible/)
  assert.match(source, /openai-compatible/)
})
