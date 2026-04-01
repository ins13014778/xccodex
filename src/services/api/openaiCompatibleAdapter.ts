import { createOpenAICompatibleHTTPClient } from './openaiCompatibleClient.js'

type AnthropicTextBlock = {
  type: 'text'
  text: string
}

type AnthropicMessageParam = {
  role: 'user' | 'assistant'
  content: string | Array<{ type: string; text?: string }>
}

type AnthropicCreateParams = {
  model?: string
  max_tokens?: number
  system?: string | AnthropicTextBlock[]
  messages: AnthropicMessageParam[]
  temperature?: number
  stop_sequences?: string[]
  stream?: boolean
  tools?: unknown
  tool_choice?: unknown
  output_config?: unknown
  thinking?: unknown
}

type OpenAICompatibleCompletion = {
  id?: string
  choices?: Array<{
    finish_reason?: string | null
    message?: {
      content?: string | null
    }
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
  }
}

function assertBasicConversationOnly(params: AnthropicCreateParams): void {
  if (
    params.tools ||
    params.tool_choice ||
    params.output_config ||
    params.thinking
  ) {
    throw new Error(
      'openaiCompatible adapter currently supports basic text-only chat only',
    )
  }
}

function blocksToText(
  content: string | Array<{ type: string; text?: string }> | undefined,
  label: string,
): string {
  if (!content) {
    return ''
  }

  if (typeof content === 'string') {
    return content
  }

  return content
    .map(block => {
      if (block.type !== 'text') {
        throw new Error(
          `openaiCompatible adapter does not support ${label} content block type "${block.type}"`,
        )
      }
      return block.text ?? ''
    })
    .join('\n\n')
}

export function mapAnthropicMessagesToOpenAIChatRequest(
  params: AnthropicCreateParams,
) {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = []

  const systemText =
    typeof params.system === 'string'
      ? params.system
      : blocksToText(params.system, 'system')
  if (systemText.trim().length > 0) {
    messages.push({ role: 'system', content: systemText })
  }

  for (const message of params.messages) {
    messages.push({
      role: message.role,
      content: blocksToText(message.content, message.role),
    })
  }

  return {
    model: params.model ?? '',
    messages,
    ...(params.max_tokens !== undefined
      ? { max_tokens: params.max_tokens }
      : {}),
    ...(params.temperature !== undefined
      ? { temperature: params.temperature }
      : {}),
    ...(params.stop_sequences?.length ? { stop: params.stop_sequences } : {}),
  }
}

function mapFinishReasonToStopReason(
  finishReason: string | null | undefined,
): string | null {
  switch (finishReason) {
    case 'length':
      return 'max_tokens'
    case 'tool_calls':
      return 'tool_use'
    case 'content_filter':
      return 'refusal'
    case 'stop':
    case null:
    case undefined:
      return 'end_turn'
    default:
      return 'end_turn'
  }
}

function readAssistantText(completion: OpenAICompatibleCompletion): string {
  const content = completion.choices?.[0]?.message?.content
  return typeof content === 'string' ? content : ''
}

export function mapOpenAICompletionToAnthropicMessage(
  completion: OpenAICompatibleCompletion,
  model: string,
) {
  const text = readAssistantText(completion)
  const finishReason = completion.choices?.[0]?.finish_reason

  return {
    id: completion.id ?? 'openai-compatible-response',
    type: 'message',
    role: 'assistant',
    model,
    content: [{ type: 'text', text }],
    stop_reason: mapFinishReasonToStopReason(finishReason),
    stop_sequence: null,
    usage: {
      input_tokens: completion.usage?.prompt_tokens ?? 0,
      output_tokens: completion.usage?.completion_tokens ?? 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
    _request_id: completion.id ?? null,
  }
}

function createSyntheticStream(message: ReturnType<typeof mapOpenAICompletionToAnthropicMessage>) {
  const controller = new AbortController()
  const textBlock = message.content[0] ?? { type: 'text', text: '' }
  const initialUsage = {
    ...message.usage,
    output_tokens: 0,
  }
  const events = [
    {
      type: 'message_start',
      message: {
        ...message,
        content: [],
        stop_reason: null,
        usage: initialUsage,
      },
    },
    {
      type: 'content_block_start',
      index: 0,
      content_block: {
        type: 'text',
        text: '',
      },
    },
    {
      type: 'content_block_delta',
      index: 0,
      delta: {
        type: 'text_delta',
        text: textBlock.text,
      },
    },
    {
      type: 'content_block_stop',
      index: 0,
    },
    {
      type: 'message_delta',
      delta: {
        stop_reason: message.stop_reason,
        stop_sequence: null,
      },
      usage: message.usage,
    },
    {
      type: 'message_stop',
    },
  ]

  return {
    controller,
    async *[Symbol.asyncIterator]() {
      for (const event of events) {
        if (controller.signal.aborted) {
          return
        }
        yield event
      }
    },
  }
}

export function createOpenAICompatibleAnthropicAdapter({
  baseUrl,
  apiKey,
  model: defaultModel,
  fetch,
  defaultHeaders,
  timeoutMs,
}: {
  baseUrl: string
  apiKey: string
  model?: string
  fetch?: typeof globalThis.fetch
  defaultHeaders?: Record<string, string>
  timeoutMs?: number
}) {
  const httpClient = createOpenAICompatibleHTTPClient({
    baseUrl,
    apiKey,
    fetch,
    defaultHeaders,
    timeoutMs,
  })

  const create = (
    params: AnthropicCreateParams,
    options?: { signal?: AbortSignal },
  ) => {
    assertBasicConversationOnly(params)
    const request = mapAnthropicMessagesToOpenAIChatRequest({
      ...params,
      model: params.model ?? defaultModel,
    })
    const resolvedModel = request.model

    if (params.stream) {
      return {
        withResponse: async () => {
          const completion = await httpClient.createChatCompletion(
            request,
            options,
          )
          const message = mapOpenAICompletionToAnthropicMessage(
            completion,
            resolvedModel,
          )

          return {
            data: createSyntheticStream(message),
            response: new Response(JSON.stringify(completion), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            }),
            request_id: completion.id ?? null,
          }
        },
      }
    }

    return httpClient
      .createChatCompletion(request, options)
      .then(completion =>
        mapOpenAICompletionToAnthropicMessage(completion, resolvedModel),
      )
  }

  return {
    beta: {
      messages: {
        create,
      },
    },
  }
}
