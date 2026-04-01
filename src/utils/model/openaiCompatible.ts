export type OpenAICompatibleConfig = {
  baseUrl: string
  apiKey: string
  model: string
}

function getTrimmedOpenAICompatibleEnv(
  envName: 'XCCODE_BASE_URL' | 'XCCODE_API_KEY' | 'XCCODE_MODEL',
): string | undefined {
  return process.env[envName]?.trim() || undefined
}

function getRequiredOpenAICompatibleEnv(
  envName: 'XCCODE_BASE_URL' | 'XCCODE_API_KEY' | 'XCCODE_MODEL',
): string {
  const value = getTrimmedOpenAICompatibleEnv(envName)
  if (!value) {
    throw new Error(
      `Missing required environment variable ${envName} for openaiCompatible provider`,
    )
  }
  return value
}

export function getOpenAICompatibleModel(): string {
  return getRequiredOpenAICompatibleEnv('XCCODE_MODEL')
}

export function getOpenAICompatibleConfig(
  model = getOpenAICompatibleModel(),
): OpenAICompatibleConfig {
  return {
    baseUrl: getRequiredOpenAICompatibleEnv('XCCODE_BASE_URL'),
    apiKey: getRequiredOpenAICompatibleEnv('XCCODE_API_KEY'),
    model,
  }
}
