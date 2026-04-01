# xccodex Build Manual

This document records the practical build, test, run, and packaging flow for the current `xccodex` repository.

## 1. Requirements

- Node.js `>= 18`
- npm
- internet access for dependency install

Recommended:

- Node.js 20+
- PowerShell 7+ on Windows

## 2. Install dependencies

```bash
npm install
```

## 3. Build

```bash
npm run build
```

Expected outputs:

- `dist/cli.js`
- `dist/xccodex.js`

## 4. Run

Main CLI:

```bash
npm start
```

Source-tree helper:

```bash
npm run cli:run
```

Novice launcher:

```bash
node .\dist\xccodex.js
```

Force reconfiguration:

```bash
node .\dist\xccodex.js --reconfigure
```

## 5. Provider configuration

In-app commands:

```text
/provider show
/provider set
/provider clear
```

OpenAI-compatible example:

```text
/provider set --protocol openai-compatible --base-url https://api.deepseek.com/v1 --api-key your_key --model deepseek-chat
```

Anthropic-compatible example:

```text
/provider set --protocol anthropic-compatible --base-url https://your-gateway.example/v1/messages --api-key your_key --model claude-3-5-sonnet
```

## 6. Current config paths

Current compatibility paths used by the implementation:

- user settings: `~/.xccode/settings.json`
- project settings: `.xccode/settings.json`
- local override: `.xccode/settings.local.json`
- user rules: `~/.xccode/XCCODE.md`
- project rules: `./XCCODE.md`

## 7. Environment variables

Current provider-related env vars:

- `XCCODE_PROVIDER_PROTOCOL`
- `XCCODE_BASE_URL`
- `XCCODE_API_KEY`
- `XCCODE_MODEL`
- `XCCODE_USE_OPENAI_COMPATIBLE`

PowerShell example:

```powershell
$env:XCCODE_USE_OPENAI_COMPATIBLE = '1'
$env:XCCODE_BASE_URL = 'https://api.openai.com/v1'
$env:XCCODE_API_KEY = 'your-api-key'
$env:XCCODE_MODEL = 'gpt-4.1-mini'
```

## 8. Validation before publish

```bash
npm test
npm run build
npm run pack:check
```

Manual help checks:

```bash
node .\dist\cli.js --help
node .\dist\xccodex.js --help
```

## 9. Publish

Public npm publish command:

```bash
npm publish --access public
```

Package name:

```text
xccodex
```
