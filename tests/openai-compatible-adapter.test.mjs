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

test('Task 6 files exist', () => {
  assert.equal(
    fs.existsSync(
      path.join(
        PROJECT_ROOT,
        'src',
        'services',
        'api',
        'openaiCompatibleClient.ts',
      ),
    ),
    true,
  )

  assert.equal(
    fs.existsSync(
      path.join(
        PROJECT_ROOT,
        'src',
        'services',
        'api',
        'openaiCompatibleAdapter.ts',
      ),
    ),
    true,
  )
})

test('openaiCompatible HTTP client posts to /chat/completions with merged headers', async () => {
  const { createOpenAICompatibleHTTPClient } = loadTsModule(
    'src/services/api/openaiCompatibleClient.ts',
  )

  const calls = []
  const client = createOpenAICompatibleHTTPClient({
    baseUrl: 'https://example.test/v1',
    apiKey: 'test-key',
    fetch: async (input, init) => {
      calls.push({
        url: String(input),
        method: init?.method,
        headers: Object.fromEntries(new Headers(init?.headers).entries()),
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      })

      return new Response(
        JSON.stringify({
          id: 'chatcmpl-test',
          choices: [
            {
              index: 0,
              finish_reason: 'stop',
              message: {
                role: 'assistant',
                content: 'pong',
              },
            },
          ],
          usage: {
            prompt_tokens: 11,
            completion_tokens: 7,
            total_tokens: 18,
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      )
    },
    defaultHeaders: {
      'x-app': 'cli',
      'x-extra-header': 'task6',
    },
  })

  const response = await client.createChatCompletion({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'ping' }],
    max_tokens: 64,
  })

  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://example.test/v1/chat/completions')
  assert.equal(calls[0].method, 'POST')
  assert.equal(calls[0].headers.authorization, 'Bearer test-key')
  assert.equal(calls[0].headers['content-type'], 'application/json')
  assert.equal(calls[0].headers['x-app'], 'cli')
  assert.equal(calls[0].headers['x-extra-header'], 'task6')
  assert.deepEqual(calls[0].body, {
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'ping' }],
    max_tokens: 64,
  })
  assert.equal(response.choices[0].message.content, 'pong')
})

test('openaiCompatible adapter maps simple Anthropic-style messages to chat completions', async () => {
  const requests = []
  const { createOpenAICompatibleAnthropicAdapter } = loadTsModule(
    'src/services/api/openaiCompatibleAdapter.ts',
    {
      createOpenAICompatibleHTTPClient: () => ({
        createChatCompletion: async payload => {
          requests.push(payload)
          return {
            id: 'chatcmpl-adapter',
            choices: [
              {
                index: 0,
                finish_reason: 'stop',
                message: {
                  role: 'assistant',
                  content: 'Hello from adapter',
                },
              },
            ],
            usage: {
              prompt_tokens: 12,
              completion_tokens: 4,
              total_tokens: 16,
            },
          }
        },
      }),
    },
  )

  const adapter = createOpenAICompatibleAnthropicAdapter({
    baseUrl: 'https://example.test/v1',
    apiKey: 'test-key',
    defaultHeaders: { 'x-app': 'cli' },
  })

  const response = await adapter.beta.messages.create({
    model: 'gpt-4o-mini',
    max_tokens: 128,
    system: [
      { type: 'text', text: 'You are concise.' },
      { type: 'text', text: 'Stay factual.' },
    ],
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: 'Say hello' }],
      },
    ],
    temperature: 0.25,
    stop_sequences: ['DONE'],
  })

  assert.deepEqual(requests, [
    {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are concise.\n\nStay factual.' },
        { role: 'user', content: 'Say hello' },
      ],
      max_tokens: 128,
      temperature: 0.25,
      stop: ['DONE'],
    },
  ])

  assert.equal(response.role, 'assistant')
  assert.equal(response.content[0].type, 'text')
  assert.equal(response.content[0].text, 'Hello from adapter')
  assert.equal(response.stop_reason, 'end_turn')
  assert.deepEqual(response.usage, {
    input_tokens: 12,
    output_tokens: 4,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  })
  assert.equal(response._request_id, 'chatcmpl-adapter')
})

test('openaiCompatible adapter exposes a minimal streaming-compatible wrapper', async () => {
  const { createOpenAICompatibleAnthropicAdapter } = loadTsModule(
    'src/services/api/openaiCompatibleAdapter.ts',
    {
      createOpenAICompatibleHTTPClient: () => ({
        createChatCompletion: async () => ({
          id: 'chatcmpl-stream',
          choices: [
            {
              index: 0,
              finish_reason: 'stop',
              message: {
                role: 'assistant',
                content: 'streamed text',
              },
            },
          ],
          usage: {
            prompt_tokens: 9,
            completion_tokens: 2,
            total_tokens: 11,
          },
        }),
      }),
    },
  )

  const adapter = createOpenAICompatibleAnthropicAdapter({
    baseUrl: 'https://example.test/v1',
    apiKey: 'test-key',
  })

  const streamHandle = adapter.beta.messages.create({
    model: 'gpt-4o-mini',
    max_tokens: 32,
    stream: true,
    messages: [{ role: 'user', content: 'hello' }],
  })

  assert.equal(typeof streamHandle.withResponse, 'function')

  const result = await streamHandle.withResponse()
  const events = []
  for await (const event of result.data) {
    events.push(event)
  }

  assert.equal(result.request_id, 'chatcmpl-stream')
  assert.equal(result.response instanceof Response, true)
  assert.equal(typeof result.data.controller.abort, 'function')
  assert.deepEqual(
    events.map(event => event.type),
    [
      'message_start',
      'content_block_start',
      'content_block_delta',
      'content_block_stop',
      'message_delta',
      'message_stop',
    ],
  )
  assert.equal(events[2].delta.text, 'streamed text')
})

test('client.ts adds an openaiCompatible provider branch', () => {
  const source = readSource('src/services/api/client.ts')

  assert.match(source, /openaiCompatible/)
  assert.match(source, /createOpenAICompatibleAnthropicAdapter/)
  assert.match(source, /getOpenAICompatibleConfig/)
})
