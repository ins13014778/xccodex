import * as React from 'react'
import { useState } from 'react'
import { Box, Text } from '../../ink.js'
import TextInput from '../../components/TextInput.js'
import { Select } from '../../components/CustomSelect/index.js'
import type { LocalJSXCommandCall, CommandResultDisplay } from '../../types/command.js'
import { shouldInferenceConfigCommandBeImmediate } from '../../utils/immediateCommand.js'
import {
  clearProviderConfig,
  formatProviderConfigForDisplay,
  getSavedUserProviderConfig,
  parseProviderCommandArgs,
  PROVIDER_PROTOCOLS,
  saveProviderConfig,
  type ProviderConfig,
  validateCompleteProviderConfig,
} from './providerCore.js'

type ProviderWizardProps = {
  initial: Partial<ProviderConfig>
  onDone: (
    result?: string,
    options?: { display?: CommandResultDisplay },
  ) => void
  onApplyModel: (model: string) => void
}

type WizardStep = 'protocol' | 'baseUrl' | 'apiKey' | 'model'

function ProviderWizard({ initial, onDone, onApplyModel }: ProviderWizardProps): React.ReactNode {
  const [protocol, setProtocol] = useState<ProviderConfig['protocol'] | undefined>(
    initial.protocol,
  )
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl ?? '')
  const [apiKey, setApiKey] = useState(initial.apiKey ?? '')
  const [model, setModel] = useState(initial.model ?? '')
  const [step, setStep] = useState<WizardStep>(initial.protocol ? 'baseUrl' : 'protocol')

  const finish = (): void => {
    try {
      const config = validateCompleteProviderConfig({
        protocol,
        baseUrl,
        apiKey,
        model,
      })
      const result = saveProviderConfig(config)
      if (result.error) {
        onDone(`Failed to save provider config: ${result.error}`, {
          display: 'system',
        })
        return
      }
      onApplyModel(config.model)
      onDone(`Provider saved.\n${formatProviderConfigForDisplay(config)}`, {
        display: 'system',
      })
    } catch (error) {
      onDone((error as Error).message, { display: 'system' })
    }
  }

  return (
    <Box flexDirection="column">
      <Text bold>Configure provider</Text>
      <Text dimColor>Saved to ~/.xccode/settings.json</Text>
      {step === 'protocol' ? (
        <Select
          options={PROVIDER_PROTOCOLS.map(value => ({
            label: value,
            value,
            description:
              value === 'anthropic-compatible'
                ? 'Use the built-in Anthropic-compatible path'
                : 'Use the OpenAI-compatible adapter',
          }))}
          onChange={value => {
            setProtocol(value as ProviderConfig['protocol'])
            setStep('baseUrl')
          }}
          onCancel={() => onDone('Provider setup cancelled', { display: 'system' })}
        />
      ) : (
        <>
          <Text>Protocol: {protocol}</Text>
          {step === 'baseUrl' && (
            <TextInput
              value={baseUrl}
              onChange={setBaseUrl}
              onSubmit={() => setStep('apiKey')}
              onExit={() => onDone('Provider setup cancelled', { display: 'system' })}
              focus
              placeholder="Enter base URL"
            />
          )}
          {step === 'apiKey' && (
            <TextInput
              value={apiKey}
              onChange={setApiKey}
              onSubmit={() => setStep('model')}
              onExit={() => onDone('Provider setup cancelled', { display: 'system' })}
              focus
              placeholder="Enter API key"
              mask="*"
            />
          )}
          {step === 'model' && (
            <TextInput
              value={model}
              onChange={setModel}
              onSubmit={finish}
              onExit={() => onDone('Provider setup cancelled', { display: 'system' })}
              focus
              placeholder="Enter model"
            />
          )}
          <Text dimColor>
            {step === 'baseUrl'
              ? 'Base URL'
              : step === 'apiKey'
                ? 'API Key'
                : 'Model'}
          </Text>
        </>
      )}
    </Box>
  )
}

export const call: LocalJSXCommandCall = async (onDone, context, args) => {
  let parsed
  try {
    parsed = parseProviderCommandArgs(args ?? '')
  } catch (error) {
    onDone((error as Error).message, { display: 'system' })
    return null
  }

  const applyModelToSession = (model: string): void => {
    context.setAppState(prev => ({
      ...prev,
      mainLoopModel: model,
      mainLoopModelForSession: null,
    }))
    context.onChangeAPIKey()
  }

  switch (parsed.action) {
    case 'help':
      onDone(
        'Usage: /provider [show|clear|set]\n/provider set --protocol <anthropic-compatible|openai-compatible> --base-url <url> --api-key <key> --model <model>',
        { display: 'system' },
      )
      return null
    case 'show':
      onDone(formatProviderConfigForDisplay(getSavedUserProviderConfig()), {
        display: 'system',
      })
      return null
    case 'clear': {
      const result = clearProviderConfig()
      onDone(
        result.error
          ? `Failed to clear provider config: ${result.error}`
          : 'Provider configuration cleared.',
        { display: 'system' },
      )
      return null
    }
    case 'set': {
      const saved = getSavedUserProviderConfig()
      const merged = {
        ...saved,
        ...parsed.values,
      }
      const hasAllFields =
        merged.protocol && merged.baseUrl && merged.apiKey && merged.model

      if (hasAllFields) {
        try {
          const config = validateCompleteProviderConfig(merged)
          const result = saveProviderConfig(config)
          if (result.error) {
            onDone(`Failed to save provider config: ${result.error}`, {
              display: 'system',
            })
            return null
          }
          applyModelToSession(config.model)
          onDone(`Provider saved.\n${formatProviderConfigForDisplay(config)}`, {
            display: 'system',
          })
          return null
        } catch (error) {
          onDone((error as Error).message, { display: 'system' })
          return null
        }
      }

      return (
        <ProviderWizard
          initial={merged}
          onDone={onDone}
          onApplyModel={applyModelToSession}
        />
      )
    }
  }
}

export const immediate = shouldInferenceConfigCommandBeImmediate()

