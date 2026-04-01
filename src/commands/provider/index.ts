import type { Command } from '../../commands.js'
import { shouldInferenceConfigCommandBeImmediate } from '../../utils/immediateCommand.js'

const provider = {
  type: 'local-jsx',
  name: 'provider',
  description: 'Configure provider protocol, base URL, API key, and model',
  argumentHint:
    '[show|clear|set --protocol <anthropic-compatible|openai-compatible> --base-url <url> --api-key <key> --model <model>]',
  get immediate() {
    return shouldInferenceConfigCommandBeImmediate()
  },
  load: () => import('./provider.js'),
} satisfies Command

export default provider
