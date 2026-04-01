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

function withEnv(overrides, fn) {
  const previous = new Map()

  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key])
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  try {
    return fn()
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
}

test('providers.ts includes openaiCompatible provider support', () => {
  const source = readSource('src/utils/model/providers.ts')

  assert.match(source, /openaiCompatible/)
  assert.match(source, /XCCODE_USE_OPENAI_COMPATIBLE/)
})

test('openaiCompatible config parser file exists', () => {
  const configPath = path.join(
    PROJECT_ROOT,
    'src',
    'utils',
    'model',
    'openaiCompatible.ts',
  )

  assert.equal(fs.existsSync(configPath), true)
})

test('openaiCompatible config parser reads required XCCODE env vars', () => {
  const source = readSource('src/utils/model/openaiCompatible.ts')

  assert.match(source, /getOpenAICompatibleModel/)
  assert.match(source, /getOpenAICompatibleConfig/)
  assert.match(source, /XCCODE_BASE_URL/)
  assert.match(source, /XCCODE_API_KEY/)
  assert.match(source, /XCCODE_MODEL/)
})

test('model-only path does not require baseUrl or apiKey', () => {
  const { getOpenAICompatibleModel } = loadTsModule(
    'src/utils/model/openaiCompatible.ts',
  )

  withEnv(
    {
      XCCODE_MODEL: 'gpt-4o-mini',
      XCCODE_BASE_URL: undefined,
      XCCODE_API_KEY: undefined,
    },
    () => {
      assert.doesNotThrow(() => getOpenAICompatibleModel())
      assert.equal(getOpenAICompatibleModel(), 'gpt-4o-mini')
    },
  )
})

test('full config can reuse a pre-resolved openaiCompatible model', () => {
  const { getOpenAICompatibleConfig } = loadTsModule(
    'src/utils/model/openaiCompatible.ts',
  )

  withEnv(
    {
      XCCODE_MODEL: 'env-model',
      XCCODE_BASE_URL: 'https://example.test/v1',
      XCCODE_API_KEY: 'test-key',
    },
    () => {
      const config = getOpenAICompatibleConfig('resolved-model')

      assert.equal(config.model, 'resolved-model')
      assert.equal(config.baseUrl, 'https://example.test/v1')
      assert.equal(config.apiKey, 'test-key')
    },
  )
})

test('model.ts uses the openaiCompatible model single source instead of settings or ANTHROPIC_MODEL', () => {
  const { getUserSpecifiedModelSetting } = loadTsModule(
    'src/utils/model/model.ts',
    {
      getMainLoopModelOverride: () => undefined,
      getSettings_DEPRECATED: () => ({ model: 'settings-model' }),
      getAPIProvider: () => 'openaiCompatible',
      getOpenAICompatibleModel: () => 'xccode-model',
      isModelAllowed: () => true,
    },
  )

  withEnv(
    {
      ANTHROPIC_MODEL: 'anthropic-model',
      XCCODE_MODEL: 'env-xccode-model',
    },
    () => {
      assert.equal(getUserSpecifiedModelSetting(), 'xccode-model')
    },
  )
})

test('openaiCompatible provider returns defined model strings and teammate fallback', () => {
  const modelConfigStub = {
    haiku45: { firstParty: 'claude-haiku-4-5' },
    sonnet45: { firstParty: 'claude-sonnet-4-5' },
    sonnet46: { firstParty: 'claude-sonnet-4-6' },
    opus46: { firstParty: 'claude-opus-4-6' },
  }

  const { getModelStrings } = loadTsModule('src/utils/model/modelStrings.ts', {
    getModelStringsState: () => null,
    setModelStringsState: () => {},
    logError: () => {},
    sequential: fn => fn,
    getInitialSettings: () => ({}),
    findFirstMatch: () => null,
    getBedrockInferenceProfiles: async () => [],
    ALL_MODEL_CONFIGS: modelConfigStub,
    CANONICAL_ID_TO_KEY: {},
    getAPIProvider: () => 'openaiCompatible',
    getOpenAICompatibleModel: () => undefined,
  })
  const { getHardcodedTeammateModelFallback } = loadTsModule(
    'src/utils/swarm/teammateModel.ts',
    {
      CLAUDE_OPUS_4_6_CONFIG: { firstParty: 'claude-opus-4-6' },
      getAPIProvider: () => 'openaiCompatible',
      getOpenAICompatibleModel: () => 'gpt-4o-mini',
    },
  )

  const modelStrings = getModelStrings()

  assert.equal(modelStrings.opus46, 'claude-opus-4-6')
  assert.equal(modelStrings.sonnet46, 'claude-sonnet-4-6')
  assert.notEqual(modelStrings.opus46, undefined)
  assert.equal(getHardcodedTeammateModelFallback(), 'gpt-4o-mini')
})

test('teammate fallback does not silently return a Claude model when XCCODE_MODEL is missing', () => {
  const { getHardcodedTeammateModelFallback } = loadTsModule(
    'src/utils/swarm/teammateModel.ts',
    {
      CLAUDE_OPUS_4_6_CONFIG: { firstParty: 'claude-opus-4-6' },
      getAPIProvider: () => 'openaiCompatible',
      getOpenAICompatibleModel: () => {
        throw new Error('Missing required environment variable XCCODE_MODEL')
      },
    },
  )

  assert.throws(
    () => getHardcodedTeammateModelFallback(),
    /XCCODE_MODEL/,
  )
})
