# xccode Build and Packaging Manual

This manual documents how to build, run, and package the current `xccode` source tree.

> Important: the npm package is **not published yet**. Use this manual to build from source and validate packaging. Do not describe the package as already released.

## 1. Environment requirements

Required:

- Node.js `>= 18`
- npm
- access to the npm registry for dependency install

Recommended:

- Node.js 20+
- PowerShell 7+ on Windows if you plan to use the PowerShell examples below

## 2. Install dependencies

From the repository root:

```bash
npm install
```

If you need a local npm cache inside the repository:

```bash
npm_config_cache=.npm-cache npm install
```

## 3. Build the CLI

```bash
npm run build
```

Expected build outputs:

- `dist/cli.js`
- `dist/cli.js.map`

## 4. Run the built CLI

Run the built artifact directly:

```bash
npm start
```

Repository helper:

```bash
npm run cli:run
```

One-shot check:

```bash
npm run cli:run -- -p "Reply with exactly: OK"
```

`npm run cli:run` is a repository helper around `dist/cli.js`. It is useful during source development because it mirrors environment config into the local run.

## 5. Configuration and instruction file locations

Preferred current locations:

| Purpose | Preferred path |
| --- | --- |
| Global settings | `~/.xccode/settings.json` |
| Project settings | `.xccode/settings.json` |
| Local uncommitted settings | `.xccode/settings.local.json` |
| User instruction file | `~/.xccode/XCCODE.md` |
| Project instruction file | `./XCCODE.md` |

Compatibility notes:

- legacy `~/.claude/settings.json` may still be read by compatibility code paths
- legacy `CLAUDE.md`, `.claude/CLAUDE.md`, and `.claude/rules/*.md` are still relevant during migration
- new docs, examples, and onboarding should use `xccode`, `.xccode`, `~/.xccode`, and `XCCODE.md`

## 6. `~/.xccode/settings.json` example

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

## 7. PowerShell environment variable setup

Current shell session:

```powershell
$env:ANTHROPIC_API_KEY = 'your-api-key'
$env:XCCODE_USE_OPENAI_COMPATIBLE = '1'
$env:XCCODE_BASE_URL = 'https://api.openai.com/v1'
$env:XCCODE_API_KEY = 'your-openai-compatible-key'
$env:XCCODE_MODEL = 'gpt-4.1-mini'
```

Persist for future shells:

```powershell
[Environment]::SetEnvironmentVariable('ANTHROPIC_API_KEY', 'your-api-key', 'User')
[Environment]::SetEnvironmentVariable('XCCODE_USE_OPENAI_COMPATIBLE', '1', 'User')
[Environment]::SetEnvironmentVariable('XCCODE_BASE_URL', 'https://api.openai.com/v1', 'User')
[Environment]::SetEnvironmentVariable('XCCODE_API_KEY', 'your-openai-compatible-key', 'User')
[Environment]::SetEnvironmentVariable('XCCODE_MODEL', 'gpt-4.1-mini', 'User')
```

## 8. OpenAI-compatible adapter: current scope

The current `openaiCompatible` path is a minimal compatibility layer.

Supported today:

- basic text-only chat
- non-stream completion + synthetic stream wrapper

Not supported today:

- tools / tool calls
- thinking / reasoning controls
- structured output
- full Anthropic semantic compatibility
- broad multimodal compatibility

Treat it as a narrow bridge for `/chat/completions`-style plain text chat only.

## 9. Provider command

`xccode` now supports an in-app provider configuration command:

```text
/provider set
/provider show
/provider clear
```

Direct argument example:

```text
/provider set --protocol openai-compatible --base-url https://api.deepseek.com/v1 --api-key your_key --model deepseek-chat
```

The command writes configuration to `~/.xccode/settings.json`.

Supported protocols:

- `anthropic-compatible`
- `openai-compatible`

Behavior:

- `anthropic-compatible` reuses the project's existing Anthropic-compatible path
- `openai-compatible` uses the current minimal adapter layer
- `show` masks the API key
- `clear` removes the saved provider configuration

## 10. Repository helper note

The source-tree helper script (`npm run cli:run`) currently:

- uses a repo-local runtime config directory for isolation during development
- reads env values from `~/.xccode/settings.json` first when available
- falls back to legacy `~/.claude/settings.json` if needed

That behavior is for source-tree development convenience. Public docs should still point users to `~/.xccode/settings.json` and `XCCODE.md`.

## 11. Packaging / pre-release checklist

Before calling a build “ready to publish”, run at least:

```bash
npm run build
npm run pack:check
```

What `npm run pack:check` does:

```bash
npm pack --dry-run
```

Use it to confirm:

- the tarball contains the expected built assets and docs
- the README is included and reflects `xccode` branding
- package metadata is aligned with the current public positioning
- docs do not claim the package is already live on npm

## 12. README release-note expectations

The README should clearly state:

- package name: `xccode`
- preferred config root: `~/.xccode`
- preferred instruction file: `XCCODE.md`
- migration compatibility with legacy `CLAUDE.md`
- OpenAI-compatible is intentionally limited and should not be over-promised
