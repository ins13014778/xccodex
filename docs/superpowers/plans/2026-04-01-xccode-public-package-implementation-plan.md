# xccode Public Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前 CLI 工程改造成可公开发布的 `xccode` npm 包，完成品牌切换、`XCCODE.md` 规则文件兼容、配置目录与环境变量品牌化，以及 OpenAI-compatible 基础对话支持。

**Architecture:** 先对外统一包名、命令名、欢迎页、帮助文本、配置目录和默认规则文件名；同时保留 `CLAUDE.md` 的只读兼容。模型侧不做全量 provider 抽象重写，而是在现有 Anthropic 主路径旁边增加 `openaiCompatible` provider 与一个最小适配层，让第一版先支持基础对话与基础流式输出。

**Tech Stack:** Node.js 22, TypeScript source tree, esbuild bundling, commander CLI, Anthropic SDK, axios/undici, Node built-in `node:test`.

---

## File Structure

### Existing files to modify

- `D:\claude code nx\claude-code-fixed-main\package.json`
  - 改包名、bin 命令、脚本与发布字段。
- `D:\claude code nx\claude-code-fixed-main\scripts\build.mjs`
  - 改内嵌宏，如包 URL、显示名等。
- `D:\claude code nx\claude-code-fixed-main\scripts\run-recovered-cli.mjs`
  - 切换默认配置目录到 `~/.xccode`，读取 `~/.xccode/settings.json`。
- `D:\claude code nx\claude-code-fixed-main\src\main.tsx`
  - 改 CLI 名称、帮助描述、版本输出、用户提示文本、provider 开关接入点。
- `D:\claude code nx\claude-code-fixed-main\src\projectOnboardingState.ts`
  - 默认规则文件名从 `CLAUDE.md` 改到 `XCCODE.md`，保留兼容读取。
- `D:\claude code nx\claude-code-fixed-main\src\utils\envUtils.ts`
  - 默认配置目录改到 `~/.xccode`，提供 `XCCODE_CONFIG_DIR` 入口。
- `D:\claude code nx\claude-code-fixed-main\src\utils\settings\settings.ts`
  - 用户 settings 文件主路径与项目路径命名从 `.claude` 迁到 `.xccode` / `~/.xccode`。
- `D:\claude code nx\claude-code-fixed-main\src\utils\model\providers.ts`
  - 新增 `openaiCompatible` provider。
- `D:\claude code nx\claude-code-fixed-main\src\services\api\client.ts`
  - provider 分流，加入 OpenAI-compatible 客户端/适配器。
- `D:\claude code nx\claude-code-fixed-main\src\utils\model\model.ts`
  - 允许 OpenAI-compatible provider 使用自定义 model 字符串。
- `D:\claude code nx\claude-code-fixed-main\src\utils\model\configs.ts`
  - 为新 provider 增加最小映射或绕过固定 Claude 枚举。
- `D:\claude code nx\claude-code-fixed-main\README.md`
  - 重写为 `xccode` 面向公开用户的安装/配置/运行文档。
- `D:\claude code nx\claude-code-fixed-main\docs\BUILD_MANUAL.md`
  - 与新品牌和新目录同步。

### Existing files likely touched in the branding sweep

- `D:\claude code nx\claude-code-fixed-main\src\components\HelpV2\HelpV2.tsx`
- `D:\claude code nx\claude-code-fixed-main\src\components\LogoV2\feedConfigs.tsx`
- `D:\claude code nx\claude-code-fixed-main\src\utils\logoV2Utils.ts`
- `D:\claude code nx\claude-code-fixed-main\src\components\memory\MemoryFileSelector.tsx`
- `D:\claude code nx\claude-code-fixed-main\src\utils\hooks\hooksSettings.ts`
- `D:\claude code nx\claude-code-fixed-main\src\cli\update.ts`

### New files to create

- `D:\claude code nx\claude-code-fixed-main\src\services\api\openaiCompatibleClient.ts`
  - 发送 OpenAI-compatible HTTP 请求。
- `D:\claude code nx\claude-code-fixed-main\src\services\api\openaiCompatibleAdapter.ts`
  - 把现有调用上下文转换为 OpenAI-compatible 请求/响应。
- `D:\claude code nx\claude-code-fixed-main\src\utils\model\openaiCompatible.ts`
  - 解析 `XCCODE_BASE_URL` / `XCCODE_API_KEY` / `XCCODE_MODEL`。
- `D:\claude code nx\claude-code-fixed-main\tests\branding-paths.test.mjs`
  - 校验新品牌、新路径、新命令。
- `D:\claude code nx\claude-code-fixed-main\tests\openai-compatible-config.test.mjs`
  - 校验 OpenAI-compatible 环境变量解析。
- `D:\claude code nx\claude-code-fixed-main\tests\project-onboarding-files.test.mjs`
  - 校验 `XCCODE.md` 优先、`CLAUDE.md` 兼容。

### Optional new helper file if needed during implementation

- `D:\claude code nx\claude-code-fixed-main\src\utils\branding.ts`
  - 若实现中发现品牌字符串过于分散，则抽出统一常量。

---

### Task 1: 建立最小测试与打包基线

**Files:**
- Modify: `D:\claude code nx\claude-code-fixed-main\package.json`
- Create: `D:\claude code nx\claude-code-fixed-main\tests\branding-paths.test.mjs`
- Create: `D:\claude code nx\claude-code-fixed-main\tests\project-onboarding-files.test.mjs`

- [ ] **Step 1: 在 `package.json` 中加入最小测试脚本**

```json
{
  "scripts": {
    "build": "node ./scripts/build.mjs",
    "test": "node --test tests/*.test.mjs",
    "pack:check": "npm pack --dry-run"
  }
}
```

- [ ] **Step 2: 先写品牌与 onboarding 的失败测试**

```js
// D:\claude code nx\claude-code-fixed-main\tests\branding-paths.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('package metadata still needs xccode rebrand', () => {
  const pkg = JSON.parse(
    fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  )
  assert.equal(pkg.name, 'xccode')
  assert.deepEqual(pkg.bin, { xccode: 'dist/cli.js' })
})
```

```js
// D:\claude code nx\claude-code-fixed-main\tests\project-onboarding-files.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('onboarding copy references XCCODE.md', () => {
  const text = fs.readFileSync(
    new URL('../src/projectOnboardingState.ts', import.meta.url),
    'utf8',
  )
  assert.match(text, /XCCODE\.md/)
})
```

- [ ] **Step 3: 运行测试确认当前版本失败**

Run:

```bash
node --test tests/*.test.mjs
```

Expected:

```text
at least 1 test fails because package.json still uses @anthropic-ai/claude-code
```

- [ ] **Step 4: 记录打包前基线**

Run:

```bash
npm pack --dry-run
```

Expected:

```text
shows current package metadata and files, before xccode rebrand
```

- [ ] **Step 5: 检查点记录**

Run:

```bash
git rev-parse --is-inside-work-tree
```

Expected:

```text
fatal: not a git repository
```

If the workspace is later initialized as a git repo, use:

```bash
git add package.json tests/branding-paths.test.mjs tests/project-onboarding-files.test.mjs
git commit -m "test: add xccode rebrand guardrails"
```

---

### Task 2: 完成 npm 包名、命令名与显示名重命名

**Files:**
- Modify: `D:\claude code nx\claude-code-fixed-main\package.json`
- Modify: `D:\claude code nx\claude-code-fixed-main\scripts\build.mjs`
- Modify: `D:\claude code nx\claude-code-fixed-main\src\main.tsx`
- Modify: `D:\claude code nx\claude-code-fixed-main\src\components\HelpV2\HelpV2.tsx`
- Modify: `D:\claude code nx\claude-code-fixed-main\src\components\LogoV2\feedConfigs.tsx`
- Modify: `D:\claude code nx\claude-code-fixed-main\src\utils\logoV2Utils.ts`
- Modify: `D:\claude code nx\claude-code-fixed-main\src\cli\update.ts`

- [ ] **Step 1: 在 `package.json` 中改公开包名与 bin**

```json
{
  "name": "xccode",
  "private": false,
  "bin": {
    "xccode": "dist/cli.js"
  },
  "description": "Public xccode CLI rebuilt from the recovered source tree.",
  "homepage": "https://www.npmjs.com/package/xccode",
  "bugs": {
    "url": "https://www.npmjs.com/package/xccode"
  }
}
```

- [ ] **Step 2: 在 `scripts/build.mjs` 里改打包宏**

```js
const macroValues = {
  'MACRO.PACKAGE_URL': JSON.stringify('xccode'),
  'MACRO.VERSION': JSON.stringify('2.1.88'),
}
```

并把任何用户可见的 `Claude Code` 构建期字串替换为 `xccode`。

- [ ] **Step 3: 改 CLI 程序名与帮助输出**

在 `D:\claude code nx\claude-code-fixed-main\src\main.tsx` 中把核心入口改为：

```ts
program
  .name('xccode')
  .description(
    'xccode - starts an interactive session by default, use -p/--print for non-interactive output',
  )
```

并把版本字符串：

```ts
}).version(`${MACRO.VERSION} (xccode)`, '-v, --version', 'Output the version number')
```

- [ ] **Step 4: 改欢迎页与帮助页显示文案**

将以下文案改成 `xccode`：

```ts
`xccode v${MACRO.VERSION}`
```

```ts
'Tips for getting started'
```

中涉及 `Claude Code` 的标题和副文案都要同步替换。

- [ ] **Step 5: 运行测试与构建验证品牌切换**

Run:

```bash
node --test tests/*.test.mjs
npm run build
node .\dist\cli.js --help
```

Expected:

```text
tests pass
build succeeds
--help output starts with xccode usage text
```

- [ ] **Step 6: 检查点记录**

If git becomes available:

```bash
git add package.json scripts/build.mjs src/main.tsx src/components/HelpV2/HelpV2.tsx src/components/LogoV2/feedConfigs.tsx src/utils/logoV2Utils.ts src/cli/update.ts
git commit -m "feat: rebrand cli package and user-facing strings to xccode"
```

---

### Task 3: 切换配置目录到 `~/.xccode` 并品牌化环境变量入口

**Files:**
- Modify: `D:\claude code nx\claude-code-fixed-main\scripts\run-recovered-cli.mjs`
- Modify: `D:\claude code nx\claude-code-fixed-main\src\utils\envUtils.ts`
- Modify: `D:\claude code nx\claude-code-fixed-main\src\utils\settings\settings.ts`
- Create: `D:\claude code nx\claude-code-fixed-main\tests\branding-paths.test.mjs`

- [ ] **Step 1: 先扩展失败测试，要求新配置目录与新环境变量**

```js
test('launcher reads xccode settings path', () => {
  const launcher = fs.readFileSync(
    new URL('../scripts/run-recovered-cli.mjs', import.meta.url),
    'utf8',
  )
  assert.match(launcher, /\.xccode[\\/]+settings\.json/)
  assert.match(launcher, /XCCODE_CONFIG_DIR/)
})
```

- [ ] **Step 2: 改 `run-recovered-cli.mjs` 默认目录**

目标逻辑：

```js
const configDir = path.join(projectDir, '.xccode-recovery')
const globalSettingsPath = path.join(os.homedir(), '.xccode', 'settings.json')

if (process.env.XCCODE_SKIP_GLOBAL_ENV === '1') {
  return {}
}

env.XCCODE_CONFIG_DIR = configDir
env.CLAUDE_CONFIG_DIR ??= configDir
```

说明：
- 对外主入口改成 `XCCODE_*`
- 实现层可保留 `CLAUDE_CONFIG_DIR` 兜底，避免 150+ 调用点同时炸裂

- [ ] **Step 3: 改 `envUtils.ts` 的默认配置目录**

```ts
export const getClaudeConfigHomeDir = memoize(
  (): string => {
    return (
      process.env.XCCODE_CONFIG_DIR ??
      process.env.CLAUDE_CONFIG_DIR ??
      join(homedir(), '.xccode')
    ).normalize('NFC')
  },
  () => `${process.env.XCCODE_CONFIG_DIR ?? ''}:${process.env.CLAUDE_CONFIG_DIR ?? ''}`,
)
```

- [ ] **Step 4: 改 `settings.ts` 的用户与项目设置默认路径**

优先把：

```ts
return join('.claude', 'settings.json')
```

替换为：

```ts
return join('.xccode', 'settings.json')
```

并同步本地设置文件：

```ts
return join('.xccode', 'settings.local.json')
```

同时保留兼容读取旧 `.claude/settings*.json` 的回退逻辑，避免旧项目完全失效。

- [ ] **Step 5: 运行测试确认路径切换**

Run:

```bash
node --test tests/*.test.mjs
npm run build
```

Expected:

```text
tests pass
build succeeds with ~/.xccode and .xccode as primary paths
```

- [ ] **Step 6: 检查点记录**

If git becomes available:

```bash
git add scripts/run-recovered-cli.mjs src/utils/envUtils.ts src/utils/settings/settings.ts tests/branding-paths.test.mjs
git commit -m "feat: move default config paths to xccode"
```

---

### Task 4: 把默认规则文件切到 `XCCODE.md`，并兼容 `CLAUDE.md`

**Files:**
- Modify: `D:\claude code nx\claude-code-fixed-main\src\projectOnboardingState.ts`
- Modify: `D:\claude code nx\claude-code-fixed-main\src\main.tsx`
- Modify: `D:\claude code nx\claude-code-fixed-main\src\components\memory\MemoryFileSelector.tsx`
- Modify: `D:\claude code nx\claude-code-fixed-main\src\utils\hooks\hooksSettings.ts`
- Create: `D:\claude code nx\claude-code-fixed-main\tests\project-onboarding-files.test.mjs`

- [ ] **Step 1: 写兼容读取顺序的失败测试**

```js
test('XCCODE.md is preferred while CLAUDE.md remains a fallback', () => {
  const text = fs.readFileSync(
    new URL('../src/projectOnboardingState.ts', import.meta.url),
    'utf8',
  )
  assert.match(text, /XCCODE\.md/)
  assert.match(text, /CLAUDE\.md/)
})
```

- [ ] **Step 2: 改 onboarding 与提示文本**

把：

```ts
join(getCwd(), 'CLAUDE.md')
'Run /init to create a CLAUDE.md file with instructions for Claude'
```

改为类似：

```ts
const hasPrimaryRules = getFsImplementation().existsSync(join(getCwd(), 'XCCODE.md'))
const hasLegacyRules = getFsImplementation().existsSync(join(getCwd(), 'CLAUDE.md'))
const hasRulesFile = hasPrimaryRules || hasLegacyRules

'Run /init to create an XCCODE.md file with instructions for xccode'
```

- [ ] **Step 3: 改 `/init`、帮助文案、记忆文件选择器中的规则文件展示**

对用户可见说明统一替换为：

```text
XCCODE.md
```

同时在读取逻辑中保留：

```text
if XCCODE.md missing -> fallback to CLAUDE.md
```

- [ ] **Step 4: 运行规则文件兼容测试**

Run:

```bash
node --test tests/project-onboarding-files.test.mjs
```

Expected:

```text
passes, and source now references both XCCODE.md and CLAUDE.md fallback
```

- [ ] **Step 5: 检查点记录**

If git becomes available:

```bash
git add src/projectOnboardingState.ts src/main.tsx src/components/memory/MemoryFileSelector.tsx src/utils/hooks/hooksSettings.ts tests/project-onboarding-files.test.mjs
git commit -m "feat: switch default rules file to XCCODE.md"
```

---

### Task 5: 新增 `openaiCompatible` provider 与配置解析

**Files:**
- Modify: `D:\claude code nx\claude-code-fixed-main\src\utils\model\providers.ts`
- Modify: `D:\claude code nx\claude-code-fixed-main\src\utils\model\model.ts`
- Modify: `D:\claude code nx\claude-code-fixed-main\src\utils\model\configs.ts`
- Create: `D:\claude code nx\claude-code-fixed-main\src\utils\model\openaiCompatible.ts`
- Create: `D:\claude code nx\claude-code-fixed-main\tests\openai-compatible-config.test.mjs`

- [ ] **Step 1: 写 provider 解析失败测试**

```js
// D:\claude code nx\claude-code-fixed-main\tests\openai-compatible-config.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('providers include openaiCompatible and xccode env switch', () => {
  const text = fs.readFileSync(
    new URL('../src/utils/model/providers.ts', import.meta.url),
    'utf8',
  )
  assert.match(text, /openaiCompatible/)
  assert.match(text, /XCCODE_USE_OPENAI_COMPATIBLE/)
})
```

- [ ] **Step 2: 在 `providers.ts` 中增加新 provider**

目标结构：

```ts
export type APIProvider =
  | 'firstParty'
  | 'bedrock'
  | 'vertex'
  | 'foundry'
  | 'openaiCompatible'

export function getAPIProvider(): APIProvider {
  return isEnvTruthy(process.env.CLAUDE_CODE_USE_BEDROCK)
    ? 'bedrock'
    : isEnvTruthy(process.env.CLAUDE_CODE_USE_VERTEX)
      ? 'vertex'
      : isEnvTruthy(process.env.CLAUDE_CODE_USE_FOUNDRY)
        ? 'foundry'
        : isEnvTruthy(process.env.XCCODE_USE_OPENAI_COMPATIBLE)
          ? 'openaiCompatible'
          : 'firstParty'
}
```

- [ ] **Step 3: 新建 `openaiCompatible.ts` 负责解析配置**

```ts
export function getOpenAICompatibleConfig() {
  return {
    baseUrl: process.env.XCCODE_BASE_URL,
    apiKey: process.env.XCCODE_API_KEY,
    model: process.env.XCCODE_MODEL,
  }
}
```

并在缺失时抛出明确错误，例如：

```ts
throw new Error('XCCODE_BASE_URL, XCCODE_API_KEY, and XCCODE_MODEL are required when XCCODE_USE_OPENAI_COMPATIBLE=1')
```

- [ ] **Step 4: 让 `model.ts` 对该 provider 允许自定义模型字符串**

新增逻辑类似：

```ts
if (getAPIProvider() === 'openaiCompatible') {
  return process.env.XCCODE_MODEL || settings.model || 'gpt-4o-mini'
}
```

不要强行把 `deepseek-chat` / `glm-4.5` 映射回 Claude 固定枚举。

- [ ] **Step 5: 运行 provider 配置测试**

Run:

```bash
node --test tests/openai-compatible-config.test.mjs
```

Expected:

```text
passes, confirming openaiCompatible provider and xccode env keys exist
```

- [ ] **Step 6: 检查点记录**

If git becomes available:

```bash
git add src/utils/model/providers.ts src/utils/model/model.ts src/utils/model/configs.ts src/utils/model/openaiCompatible.ts tests/openai-compatible-config.test.mjs
git commit -m "feat: add openai-compatible provider configuration"
```

---

### Task 6: 增加 OpenAI-compatible 基础对话适配层

**Files:**
- Modify: `D:\claude code nx\claude-code-fixed-main\src\services\api\client.ts`
- Create: `D:\claude code nx\claude-code-fixed-main\src\services\api\openaiCompatibleClient.ts`
- Create: `D:\claude code nx\claude-code-fixed-main\src\services\api\openaiCompatibleAdapter.ts`

- [ ] **Step 1: 先写最小失败测试，锁定 adapter 文件存在与关键配置字段**

```js
test('openai-compatible adapter files exist', () => {
  assert.equal(
    fs.existsSync(new URL('../src/services/api/openaiCompatibleClient.ts', import.meta.url)),
    true,
  )
  assert.equal(
    fs.existsSync(new URL('../src/services/api/openaiCompatibleAdapter.ts', import.meta.url)),
    true,
  )
})
```

- [ ] **Step 2: 创建最小 HTTP client**

`openaiCompatibleClient.ts` 最小骨架：

```ts
import { getOpenAICompatibleConfig } from 'src/utils/model/openaiCompatible.js'

export async function createOpenAICompatibleChatCompletion(body: object) {
  const { baseUrl, apiKey } = getOpenAICompatibleConfig()
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`OpenAI-compatible request failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}
```

- [ ] **Step 3: 创建最小 adapter，把现有对话最小字段映射到 chat completions**

`openaiCompatibleAdapter.ts` 最小骨架：

```ts
import { getOpenAICompatibleConfig } from 'src/utils/model/openaiCompatible.js'
import { createOpenAICompatibleChatCompletion } from './openaiCompatibleClient.js'

export async function createOpenAICompatibleResponse(messages: Array<{ role: string; content: string }>) {
  const { model } = getOpenAICompatibleConfig()
  return createOpenAICompatibleChatCompletion({
    model,
    messages,
    stream: false,
  })
}
```

- [ ] **Step 4: 在 `client.ts` 分流到 openaiCompatible**

在 provider 分支前段加入：

```ts
if (getAPIProvider() === 'openaiCompatible') {
  const { createOpenAICompatibleAnthropicAdapter } = await import('./openaiCompatibleAdapter.js')
  return createOpenAICompatibleAnthropicAdapter({
    maxRetries,
    source,
  }) as unknown as Anthropic
}
```

这里的目标不是第一步就完美，而是让 adapter 提供最小可运行接口，先支持基础对话路径。

- [ ] **Step 5: 运行构建验证适配层不破坏现有构建**

Run:

```bash
npm run build
node .\dist\cli.js --help
```

Expected:

```text
build still succeeds with openaiCompatible files linked in
```

- [ ] **Step 6: 检查点记录**

If git becomes available:

```bash
git add src/services/api/client.ts src/services/api/openaiCompatibleClient.ts src/services/api/openaiCompatibleAdapter.ts
git commit -m "feat: add openai-compatible basic chat adapter"
```

---

### Task 7: 重写 README 与发布说明，补齐 xccode 的使用文档

**Files:**
- Modify: `D:\claude code nx\claude-code-fixed-main\README.md`
- Modify: `D:\claude code nx\claude-code-fixed-main\docs\BUILD_MANUAL.md`

- [ ] **Step 1: 用新的 README 顶部替换旧品牌与安装方式**

README 顶部最少应包含：

```md
# xccode

Public CLI package for interactive coding workflows.

## Install

```bash
npm install -g xccode
```

## Run

```bash
xccode
```
```

- [ ] **Step 2: 加入 OpenAI-compatible 配置章节**

README 中加入完整示例：

```md
## OpenAI-compatible configuration

### PowerShell

```powershell
$env:XCCODE_USE_OPENAI_COMPATIBLE="1"
$env:XCCODE_BASE_URL="https://api.deepseek.com"
$env:XCCODE_API_KEY="your_key"
$env:XCCODE_MODEL="deepseek-chat"
xccode
```

### ~/.xccode/settings.json

```json
{
  "env": {
    "XCCODE_USE_OPENAI_COMPATIBLE": "1",
    "XCCODE_BASE_URL": "https://api.deepseek.com",
    "XCCODE_API_KEY": "your_key",
    "XCCODE_MODEL": "deepseek-chat"
  }
}
```
```

- [ ] **Step 3: 明确说明规则文件兼容**

README 和 BUILD_MANUAL 中同时加：

```md
- New projects use `XCCODE.md`
- Existing projects with `CLAUDE.md` are still read as a fallback
```

- [ ] **Step 4: 运行打包预检**

Run:

```bash
npm pack --dry-run
```

Expected:

```text
package metadata shows xccode and includes updated README
```

- [ ] **Step 5: 检查点记录**

If git becomes available:

```bash
git add README.md docs/BUILD_MANUAL.md
git commit -m "docs: publish xccode installation and configuration guide"
```

---

### Task 8: 端到端验证公开包与基础对话配置

**Files:**
- Test: `D:\claude code nx\claude-code-fixed-main\package.json`
- Test: `D:\claude code nx\claude-code-fixed-main\dist\cli.js`
- Test: `D:\claude code nx\claude-code-fixed-main\README.md`

- [ ] **Step 1: 运行完整测试**

Run:

```bash
node --test tests/*.test.mjs
```

Expected:

```text
all tests pass
```

- [ ] **Step 2: 运行完整构建**

Run:

```bash
npm run build
```

Expected:

```text
dist\cli.js and dist\cli.js.map are generated successfully
```

- [ ] **Step 3: 验证 CLI 帮助与版本**

Run:

```bash
node .\dist\cli.js --help
node .\dist\cli.js --version
```

Expected:

```text
help output uses xccode
version output includes xccode branding
```

- [ ] **Step 4: 验证打包产物**

Run:

```bash
npm pack --dry-run
```

Expected:

```text
package name is xccode and bin points to dist/cli.js
```

- [ ] **Step 5: 验证 OpenAI-compatible 配置入口**

Run:

```powershell
$env:XCCODE_USE_OPENAI_COMPATIBLE="1"
$env:XCCODE_BASE_URL="https://api.deepseek.com"
$env:XCCODE_API_KEY="demo-key"
$env:XCCODE_MODEL="deepseek-chat"
node .\dist\cli.js --help
```

Expected:

```text
command boots successfully without falling back to Anthropic-only config requirements
```

- [ ] **Step 6: 发布前检查点**

If git becomes available:

```bash
git add .
git commit -m "release: prepare public xccode package"
```

If the user wants actual publishing, the final manual step is:

```bash
npm login
npm publish --access public
```

Expected:

```text
publish succeeds to the public npm registry
```

---

## Self-Review

### Spec coverage

- 品牌切换：Task 2
- 配置目录与环境变量品牌化：Task 3
- `XCCODE.md` + `CLAUDE.md` 兼容：Task 4
- OpenAI-compatible 基础对话：Task 5 + Task 6
- README / 发布：Task 7 + Task 8

### Placeholder scan

- 没有使用 TBD / TODO / “以后补”
- 所有任务都给了明确文件与命令
- 提交步骤已根据“当前不是 git 仓库”的事实做了条件化说明

### Type consistency

- provider 名统一使用 `openaiCompatible`
- 新环境变量统一使用 `XCCODE_*`
- 新主规则文件统一使用 `XCCODE.md`

