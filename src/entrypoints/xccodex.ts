import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import {
  getRecommendedModels,
  getSavedUserProviderConfig,
  isProviderConfigComplete,
  PROVIDER_PROTOCOLS,
  saveProviderConfig,
  type ProviderConfig,
  type ProviderProtocol,
} from '../commands/provider/providerCore.js'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const xccodePath = path.join(scriptDir, 'cli.js')

function printHelp(): void {
  output.write(
    [
      'Usage: xccodex [--reconfigure] [xccode-args...]',
      '',
      'One-click launcher for xccode.',
      '',
      'Behavior:',
      '- If provider config already exists, launch xccode directly.',
      '- If provider config is missing or incomplete, start an interactive setup wizard, save config, then launch xccode.',
      '',
      'Flags:',
      '- --reconfigure   Force the setup wizard even when config already exists.',
    ].join('\n') + '\n',
  )
}

function defaultBaseUrlForProtocol(protocol: ProviderProtocol): string {
  return protocol === 'anthropic-compatible'
    ? 'https://api.anthropic.com'
    : 'https://api.openai.com/v1'
}

function maskPromptValue(value: string | undefined): string {
  return value?.trim() ? `${value.trim()} (current)` : '(not set)'
}

async function promptHidden(
  rl: ReturnType<typeof createInterface>,
  promptText: string,
): Promise<string> {
  const anyRl = rl as ReturnType<typeof createInterface> & {
    _writeToOutput?: (text: string) => void
    stdoutMuted?: boolean
  }
  const originalWrite = anyRl._writeToOutput?.bind(anyRl)
  anyRl.stdoutMuted = true
  if (originalWrite) {
    anyRl._writeToOutput = (text: string) => {
      if (anyRl.stdoutMuted) {
        output.write('*')
        return
      }
      originalWrite(text)
    }
  }
  try {
    const answer = await rl.question(promptText)
    output.write('\n')
    return answer.trim()
  } finally {
    anyRl.stdoutMuted = false
    if (originalWrite) {
      anyRl._writeToOutput = originalWrite
    }
  }
}

async function promptProtocol(
  rl: ReturnType<typeof createInterface>,
  current?: ProviderProtocol,
): Promise<ProviderProtocol> {
  output.write('Select protocol:\n')
  for (const [index, protocol] of PROVIDER_PROTOCOLS.entries()) {
    const mark = protocol === current ? ' (current)' : ''
    output.write(`  ${index + 1}. ${protocol}${mark}\n`)
  }

  while (true) {
    const answer = (await rl.question('Enter choice [1-2]: ')).trim()
    const idx = Number(answer)
    if (Number.isInteger(idx) && idx >= 1 && idx <= PROVIDER_PROTOCOLS.length) {
      return PROVIDER_PROTOCOLS[idx - 1]!
    }
    output.write('Invalid selection. Please enter 1 or 2.\n')
  }
}

async function promptBaseUrl(
  rl: ReturnType<typeof createInterface>,
  protocol: ProviderProtocol,
  current?: string,
): Promise<string> {
  const fallback = current?.trim() || defaultBaseUrlForProtocol(protocol)
  const answer = (
    await rl.question(`Base URL [default: ${fallback}]: `)
  ).trim()
  return answer || fallback
}

async function promptModel(
  rl: ReturnType<typeof createInterface>,
  protocol: ProviderProtocol,
  current?: string,
): Promise<string> {
  const recommended = getRecommendedModels(protocol)
  output.write('Select model:\n')
  recommended.forEach((model, index) => {
    const mark = model === current ? ' (current)' : ''
    output.write(`  ${index + 1}. ${model}${mark}\n`)
  })
  output.write(`  ${recommended.length + 1}. custom\n`)

  while (true) {
    const answer = (
      await rl.question(`Enter choice [1-${recommended.length + 1}]: `)
    ).trim()
    const idx = Number(answer)
    if (Number.isInteger(idx) && idx >= 1 && idx <= recommended.length) {
      return recommended[idx - 1]!
    }
    if (idx === recommended.length + 1) {
      while (true) {
        const custom = (await rl.question('Custom model: ')).trim()
        if (custom) return custom
        output.write('Model cannot be empty.\n')
      }
    }
    output.write(`Invalid selection. Please enter 1-${recommended.length + 1}.\n`)
  }
}

async function runWizard(initial: Partial<ProviderConfig>): Promise<ProviderConfig> {
  const rl = createInterface({ input, output })
  try {
    output.write('Welcome to xccodex setup.\n')
    output.write(`Current protocol: ${initial.protocol ?? '(not set)'}\n`)
    output.write(`Current base URL: ${maskPromptValue(initial.baseUrl)}\n`)
    output.write(`Current model: ${maskPromptValue(initial.model)}\n`)
    output.write(`Current API key: ${initial.apiKey?.trim() ? '**** (current)' : '(not set)'}\n\n`)

    const protocol = await promptProtocol(rl, initial.protocol)
    const baseUrl = await promptBaseUrl(rl, protocol, initial.baseUrl)
    const apiKeyInput = await promptHidden(
      rl,
      `API key${initial.apiKey?.trim() ? ' [Enter to keep current]' : ''}: `,
    )
    const apiKey = apiKeyInput || initial.apiKey || ''
    const model = await promptModel(rl, protocol, initial.model)

    return {
      protocol,
      baseUrl,
      apiKey,
      model,
    }
  } finally {
    rl.close()
  }
}

function launchXccode(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [xccodePath, ...args], {
      stdio: 'inherit',
      env: process.env,
    })
    child.on('exit', code => {
      process.exitCode = code ?? 0
      resolve()
    })
    child.on('error', reject)
  })
}

export async function main(): Promise<void> {
  const rawArgs = process.argv.slice(2)
  if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
    printHelp()
    return
  }

  const reconfigure = rawArgs.includes('--reconfigure')
  const passthroughArgs = rawArgs.filter(arg => arg !== '--reconfigure')
  const saved = getSavedUserProviderConfig()

  if (!reconfigure && isProviderConfigComplete(saved)) {
    await launchXccode(passthroughArgs)
    return
  }

  const config = await runWizard(saved)
  const result = saveProviderConfig(config)
  if (result.error) {
    throw new Error(`Failed to save xccodex configuration: ${result.error}`)
  }

  output.write('Configuration saved. Launching xccode...\n')
  await launchXccode(passthroughArgs)
}

void main()
