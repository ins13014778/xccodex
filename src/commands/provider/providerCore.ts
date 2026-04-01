import { parseArguments } from '../../utils/argumentSubstitution.js'
import { applyConfigEnvironmentVariables, applyProviderProtocolEnvAliases } from '../../utils/managedEnv.js'
import { updateSettingsForSource, getSettingsForSource } from '../../utils/settings/settings.js'

export const PROVIDER_PROTOCOLS = [
  'anthropic-compatible',
  'openai-compatible',
] as const

export type ProviderProtocol = (typeof PROVIDER_PROTOCOLS)[number]

export type ProviderConfig = {
  protocol: ProviderProtocol
  baseUrl: string
  apiKey: string
  model: string
}

export const RECOMMENDED_MODELS: Record<ProviderProtocol, readonly string[]> = {
  'anthropic-compatible': [
    'claude-sonnet-4-6',
    'claude-sonnet-4-5',
    'claude-3-5-sonnet',
  ],
  'openai-compatible': [
    'deepseek-chat',
    'glm-4.5',
    'qwen-plus',
    'gpt-4.1-mini',
  ],
} as const

export type ParsedProviderCommand =
  | { action: 'show' | 'clear' | 'help' }
  | {
      action: 'set'
      values: Partial<ProviderConfig>
    }

function isProviderProtocol(value: string): value is ProviderProtocol {
  return (PROVIDER_PROTOCOLS as readonly string[]).includes(value)
}

function requireNonEmpty(value: string | undefined, name: string): string {
  const trimmed = value?.trim()
  if (!trimmed) {
    throw new Error(`${name} is required`)
  }
  return trimmed
}

export function maskProviderSecret(apiKey: string | undefined): string {
  if (!apiKey) return '(not set)'
  const trimmed = apiKey.trim()
  if (trimmed.length <= 4) return '*'.repeat(trimmed.length)
  return `${trimmed.slice(0, 2)}****${trimmed.slice(-2)}`
}

export function readSavedProviderConfig(
  env: Record<string, string | undefined> | undefined,
): Partial<ProviderConfig> {
  if (!env) return {}
  const protocol = env.XCCODE_PROVIDER_PROTOCOL
  return {
    ...(protocol && isProviderProtocol(protocol) ? { protocol } : {}),
    ...(env.XCCODE_BASE_URL ? { baseUrl: env.XCCODE_BASE_URL } : {}),
    ...(env.XCCODE_API_KEY ? { apiKey: env.XCCODE_API_KEY } : {}),
    ...(env.XCCODE_MODEL ? { model: env.XCCODE_MODEL } : {}),
  }
}

export function getSavedUserProviderConfig(): Partial<ProviderConfig> {
  return readSavedProviderConfig(getSettingsForSource('userSettings')?.env)
}

export function parseProviderCommandArgs(args: string): ParsedProviderCommand {
  const parsed = parseArguments(args)
  if (parsed.length === 0) {
    return { action: 'show' }
  }

  const [subcommand, ...rest] = parsed
  if (!subcommand) return { action: 'show' }
  if (subcommand === 'help' || subcommand === '-h' || subcommand === '--help') {
    return { action: 'help' }
  }
  if (subcommand === 'show') {
    return { action: 'show' }
  }
  if (subcommand === 'clear') {
    return { action: 'clear' }
  }
  if (subcommand !== 'set') {
    throw new Error(
      `Unknown provider subcommand: ${subcommand}. Valid subcommands are: set, show, clear`,
    )
  }

  const values: Partial<ProviderConfig> = {}
  for (let i = 0; i < rest.length; i++) {
    const token = rest[i]
    if (!token) continue
    const next = rest[i + 1]

    switch (token) {
      case '--protocol':
        if (!next || !isProviderProtocol(next)) {
          throw new Error(
            `--protocol must be one of: ${PROVIDER_PROTOCOLS.join(', ')}`,
          )
        }
        values.protocol = next
        i++
        break
      case '--base-url':
        values.baseUrl = requireNonEmpty(next, '--base-url')
        i++
        break
      case '--api-key':
        values.apiKey = requireNonEmpty(next, '--api-key')
        i++
        break
      case '--model':
        values.model = requireNonEmpty(next, '--model')
        i++
        break
      default:
        throw new Error(`Unknown provider option: ${token}`)
    }
  }

  return { action: 'set', values }
}

export function validateCompleteProviderConfig(
  config: Partial<ProviderConfig>,
): ProviderConfig {
  const protocol = config.protocol
  if (!protocol || !isProviderProtocol(protocol)) {
    throw new Error(`protocol is required and must be one of: ${PROVIDER_PROTOCOLS.join(', ')}`)
  }
  return {
    protocol,
    baseUrl: requireNonEmpty(config.baseUrl, 'baseUrl'),
    apiKey: requireNonEmpty(config.apiKey, 'apiKey'),
    model: requireNonEmpty(config.model, 'model'),
  }
}

export function isProviderConfigComplete(
  config: Partial<ProviderConfig>,
): config is ProviderConfig {
  return Boolean(
    config.protocol &&
      config.baseUrl?.trim() &&
      config.apiKey?.trim() &&
      config.model?.trim(),
  )
}

export function getRecommendedModels(
  protocol: ProviderProtocol,
): readonly string[] {
  return RECOMMENDED_MODELS[protocol]
}

export function buildProviderEnvUpdate(config: ProviderConfig): Record<string, string | undefined> {
  return {
    XCCODE_PROVIDER_PROTOCOL: config.protocol,
    XCCODE_BASE_URL: config.baseUrl,
    XCCODE_API_KEY: config.apiKey,
    XCCODE_MODEL: config.model,
  }
}

function applySessionProviderConfig(envUpdate: Record<string, string | undefined>): void {
  const managedKeys = [
    'XCCODE_PROVIDER_PROTOCOL',
    'XCCODE_BASE_URL',
    'XCCODE_API_KEY',
    'XCCODE_MODEL',
    'XCCODE_USE_OPENAI_COMPATIBLE',
    'ANTHROPIC_BASE_URL',
    'ANTHROPIC_API_KEY',
    'ANTHROPIC_MODEL',
  ] as const

  for (const key of managedKeys) {
    delete process.env[key]
  }

  for (const [key, value] of Object.entries(envUpdate)) {
    if (value !== undefined) {
      process.env[key] = value
    }
  }

  applyProviderProtocolEnvAliases(process.env)
  applyConfigEnvironmentVariables()
}

export function saveProviderConfig(config: ProviderConfig): { error?: string } {
  const envUpdate = buildProviderEnvUpdate(config)
  const result = updateSettingsForSource('userSettings', {
    env: {
      ...envUpdate,
      XCCODE_USE_OPENAI_COMPATIBLE: undefined,
      ANTHROPIC_BASE_URL: undefined,
      ANTHROPIC_API_KEY: undefined,
      ANTHROPIC_MODEL: undefined,
    },
  })
  if (result.error) {
    return { error: result.error.message }
  }
  applySessionProviderConfig(envUpdate)
  return {}
}

export function clearProviderConfig(): { error?: string } {
  const result = updateSettingsForSource('userSettings', {
    env: {
      XCCODE_PROVIDER_PROTOCOL: undefined,
      XCCODE_BASE_URL: undefined,
      XCCODE_API_KEY: undefined,
      XCCODE_MODEL: undefined,
      XCCODE_USE_OPENAI_COMPATIBLE: undefined,
      ANTHROPIC_BASE_URL: undefined,
      ANTHROPIC_API_KEY: undefined,
      ANTHROPIC_MODEL: undefined,
    },
  })
  if (result.error) {
    return { error: result.error.message }
  }
  applySessionProviderConfig({})
  return {}
}

export function formatProviderConfigForDisplay(
  config: Partial<ProviderConfig>,
): string {
  if (!config.protocol && !config.baseUrl && !config.model && !config.apiKey) {
    return 'Provider: not configured\nUse "/provider set" to configure protocol, base URL, API key, and model.'
  }

  return [
    `Protocol: ${config.protocol ?? '(not set)'}`,
    `Base URL: ${config.baseUrl ?? '(not set)'}`,
    `Model: ${config.model ?? '(not set)'}`,
    `API Key: ${maskProviderSecret(config.apiKey)}`,
  ].join('\n')
}
