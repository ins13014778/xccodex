export type OpenAICompatibleChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type OpenAICompatibleChatCompletionRequest = {
  model: string
  messages: OpenAICompatibleChatMessage[]
  max_tokens?: number
  temperature?: number
  stop?: string[]
}

export type OpenAICompatibleChatCompletionResponse = {
  id?: string
  choices?: Array<{
    index?: number
    finish_reason?: string | null
    message?: {
      role?: string
      content?: string | null
    }
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

function buildChatCompletionsUrl(baseUrl: string): string {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '')
  if (normalizedBaseUrl.endsWith('/chat/completions')) {
    return normalizedBaseUrl
  }
  return `${normalizedBaseUrl}/chat/completions`
}

function createTimeoutSignal(
  timeoutMs: number | undefined,
  signal: AbortSignal | undefined,
): { signal?: AbortSignal; cleanup: () => void } {
  if (!timeoutMs && !signal) {
    return { cleanup: () => {} }
  }

  const controller = new AbortController()
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined

  const abortFromParent = (): void => {
    controller.abort(signal?.reason)
  }

  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason)
    } else {
      signal.addEventListener('abort', abortFromParent, { once: true })
    }
  }

  if (timeoutMs && timeoutMs > 0) {
    timeoutHandle = setTimeout(() => {
      controller.abort(new Error(`openaiCompatible request timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle)
      }
      if (signal) {
        signal.removeEventListener('abort', abortFromParent)
      }
    },
  }
}

function getErrorMessage(status: number, payload: unknown): string {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    const error = record.error
    if (typeof error === 'string') {
      return error
    }
    if (error && typeof error === 'object') {
      const message = (error as Record<string, unknown>).message
      if (typeof message === 'string' && message.length > 0) {
        return message
      }
    }
  }

  return `openaiCompatible request failed with status ${status}`
}

export function createOpenAICompatibleHTTPClient({
  baseUrl,
  apiKey,
  fetch: fetchImpl = globalThis.fetch,
  defaultHeaders = {},
  timeoutMs,
}: {
  baseUrl: string
  apiKey: string
  fetch?: typeof globalThis.fetch
  defaultHeaders?: Record<string, string>
  timeoutMs?: number
}) {
  return {
    async createChatCompletion(
      payload: OpenAICompatibleChatCompletionRequest,
      options?: { signal?: AbortSignal },
    ): Promise<OpenAICompatibleChatCompletionResponse> {
      const { signal, cleanup } = createTimeoutSignal(
        timeoutMs,
        options?.signal,
      )
      try {
        const headers = new Headers(defaultHeaders)
        headers.set('authorization', `Bearer ${apiKey}`)
        headers.set('content-type', 'application/json')
        headers.set('accept', 'application/json')

        const response = await fetchImpl(buildChatCompletionsUrl(baseUrl), {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal,
        })

        const json = (await response.json()) as OpenAICompatibleChatCompletionResponse
        if (!response.ok) {
          throw new Error(getErrorMessage(response.status, json))
        }

        return json
      } finally {
        cleanup()
      }
    },
  }
}
