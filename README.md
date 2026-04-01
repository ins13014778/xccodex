# xccode

`xccode` is a terminal-first coding assistant CLI rebuilt from the recovered source tree in this repository.

> Status: the package name and docs are being prepared for npm, but `xccode` has **not** been published to npm yet. Do not assume `npm install -g xccode` works today unless a package has actually been released.

## What this repo is

This repository is the maintainable source tree used to build the `xccode` CLI. It is suitable for:

- building and testing the CLI from source
- validating packaging via `npm run pack:check`
- documenting the current public-facing config and compatibility story

For repository build details, see [`docs/BUILD_MANUAL.md`](./docs/BUILD_MANUAL.md).

## Quick start

### Planned npm install command

When the package is published, the intended public install flow is:

```bash
npm install -g xccode
xccode
```

### Current repo-based install (works today)

Until npm publish happens, use this repository directly:

```bash
npm install
npm run build
npm start
```

If you want to use the repo helper that mirrors global environment config into the local run, use:

```bash
npm run cli:run
```

## Starting xccode

Common entry points:

```bash
# interactive CLI after building
npm start

# repository helper (loads env from ~/.xccode/settings.json when available)
npm run cli:run

# one-shot prompt
npm run cli:run -- -p "Reply with exactly: OK"
```

> Note: `npm start` runs the built CLI directly. `npm run cli:run` is a repository helper for this source tree.

## Global settings: `~/.xccode/settings.json`

`xccode` now uses `~/.xccode/settings.json` as the primary global settings file.

Minimal example:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "model": "claude-sonnet-4-5",
  "permissions": {
    "defaultMode": "acceptEdits"
  },
  "env": {
    "ANTHROPIC_API_KEY": "your-api-key"
  }
}
```

Useful paths:

- global settings: `~/.xccode/settings.json`
- project settings: `.xccode/settings.json`
- local uncommitted overrides: `.xccode/settings.local.json`

If you are migrating from older Claude Code layouts, legacy `~/.claude/settings.json` may still be read by some compatibility paths, but new docs and new setups should use `~/.xccode/settings.json`.

## PowerShell environment variable configuration

For Windows / PowerShell users, you can configure credentials for the current shell session:

```powershell
$env:ANTHROPIC_API_KEY = 'your-api-key'
$env:XCCODE_USE_OPENAI_COMPATIBLE = '1'
$env:XCCODE_BASE_URL = 'https://api.openai.com/v1'
$env:XCCODE_API_KEY = 'your-openai-compatible-key'
$env:XCCODE_MODEL = 'gpt-4.1-mini'
```

To persist variables for future PowerShell sessions:

```powershell
[Environment]::SetEnvironmentVariable('ANTHROPIC_API_KEY', 'your-api-key', 'User')
[Environment]::SetEnvironmentVariable('XCCODE_USE_OPENAI_COMPATIBLE', '1', 'User')
[Environment]::SetEnvironmentVariable('XCCODE_BASE_URL', 'https://api.openai.com/v1', 'User')
[Environment]::SetEnvironmentVariable('XCCODE_API_KEY', 'your-openai-compatible-key', 'User')
[Environment]::SetEnvironmentVariable('XCCODE_MODEL', 'gpt-4.1-mini', 'User')
```

After writing persistent variables, open a new terminal before running `xccode`.

## OpenAI-compatible configuration example

You can also keep the environment block inside `~/.xccode/settings.json`:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "env": {
    "XCCODE_USE_OPENAI_COMPATIBLE": "1",
    "XCCODE_BASE_URL": "https://api.openai.com/v1",
    "XCCODE_API_KEY": "your-openai-compatible-key",
    "XCCODE_MODEL": "gpt-4.1-mini"
  }
}
```

This is the current adapter contract:

- `XCCODE_USE_OPENAI_COMPATIBLE=1` enables the OpenAI-compatible provider
- `XCCODE_BASE_URL` points to the provider base URL
- `XCCODE_API_KEY` is the credential used for the OpenAI-compatible request
- `XCCODE_MODEL` is the model name sent to the upstream `/chat/completions` API

## Current OpenAI-compatible support boundary

The current `openaiCompatible` implementation is intentionally minimal. It supports only:

- basic text-only chat
- non-stream completion + synthetic stream wrapper

It does **not** currently support:

- tools / tool calls
- thinking / reasoning controls
- structured output
- full Anthropic semantic compatibility
- broader multimodal or rich content block compatibility

In practice, treat this adapter as a lightweight bridge for plain chat-completions style usage only. Do **not** rely on it for feature parity with Anthropic-native flows.

## Provider command

You can now configure the protocol, base URL, API key, and model from inside `xccode` itself.

Supported protocols:

- `anthropic-compatible`
- `openai-compatible`

Available commands:

```text
/provider show
/provider clear
/provider set
```

Direct argument example:

```text
/provider set --protocol openai-compatible --base-url https://api.deepseek.com/v1 --api-key your_key --model deepseek-chat
```

Anthropic-compatible example:

```text
/provider set --protocol anthropic-compatible --base-url https://your-anthropic-gateway.example/v1/messages --api-key your_key --model claude-3-5-sonnet
```

Notes:

- The configuration is saved into `~/.xccode/settings.json`
- `openai-compatible` uses the current minimal adapter layer
- `anthropic-compatible` uses the project's existing Anthropic-compatible path
- `/provider show` masks the API key
- `/provider clear` removes the saved provider configuration

## `XCCODE.md` and `CLAUDE.md` compatibility

For project instructions and persistent working conventions:

- preferred new file name: `XCCODE.md`
- preferred user-level file location: `~/.xccode/XCCODE.md`
- preferred project-level settings directory: `.xccode/`

Compatibility during migration:

- legacy `CLAUDE.md` files are still recognized in parts of the codebase
- legacy `.claude/CLAUDE.md` and `.claude/rules/*.md` layouts may still be loaded by compatibility paths
- existing repos do **not** need an immediate rename to keep working
- new docs, onboarding, and examples should use `XCCODE.md` and `.xccode/`

If you are setting up a fresh repository, prefer:

```text
XCCODE.md
.xccode/settings.json
.xccode/settings.local.json
```

## Packaging check

Before publishing or sharing a package tarball, run:

```bash
npm run pack:check
```

This performs `npm pack --dry-run` so you can verify the package contents without pretending the package has already been published.

## Related docs

- build and packaging notes: [`docs/BUILD_MANUAL.md`](./docs/BUILD_MANUAL.md)

