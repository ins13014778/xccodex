# xccodex

[中文说明](#中文说明) | [English](#english)

---

## 中文说明

`xccodex` 是一个面向终端的 AI 编码助手 CLI。

这个仓库当前已经整理为可构建、可测试、可打包、可继续发布的公开项目，并补充了：

- `xccodex` 一键启动入口
- 首次启动交互式配置向导
- CLI 内置 `/provider set|show|clear`
- 支持在 `anthropic-compatible` 与 `openai-compatible` 之间切换
- 支持自定义 API 地址、API Key、模型
- 支持从源码构建 npm 包并做打包校验

> 当前对外品牌名是 **xccodex**。
> 
> 目前为了兼容已有实现，配置目录和环境变量前缀仍然使用：
>
> - 配置目录：`~/.xccode/`
> - 环境变量前缀：`XCCODE_*`
> - 规则文件：`XCCODE.md`
>
> 这是当前版本的技术兼容方案，不影响日常使用与后续公开发布。

### 1. 环境要求

- Node.js `>= 18`
- npm
- Windows / macOS / Linux 均可

推荐：

- Node.js 20+
- Windows 下使用 PowerShell 7+

### 2. 克隆后快速启动

```bash
npm install
npm run build
node .\dist\xccodex.js
```

如果你已经配置过 provider，再次执行时会直接启动。

如果还没有配置，`xccodex` 会自动进入向导，让你依次填写：

1. 协议类型
2. API Base URL
3. API Key
4. 模型名

### 3. 一键安装脚本

#### Windows PowerShell

```powershell
.\scripts\setup-windows.ps1
```

如果希望安装后直接把 `xccodex` 链接到全局命令：

```powershell
.\scripts\setup-windows.ps1 -LinkGlobal
```

#### macOS / Linux

```bash
bash ./scripts/setup-unix.sh
```

如果希望安装后直接链接全局命令：

```bash
bash ./scripts/setup-unix.sh --link-global
```

### 4. 启动方式

#### 方式 A：使用一键入口（推荐）

```bash
xccodex
```

源码开发阶段也可以这样启动：

```bash
node .\dist\xccodex.js
```

强制重新进入配置向导：

```bash
node .\dist\xccodex.js --reconfigure
```

#### 方式 B：直接运行主 CLI

```bash
npm start
```

或：

```bash
node .\dist\cli.js
```

### 5. 在 CLI 里配置接口 / 密钥 / 模型

进入 CLI 后可直接使用：

```text
/provider show
/provider set
/provider clear
```

例如：

```text
/provider set --protocol openai-compatible --base-url https://api.deepseek.com/v1 --api-key your_key --model deepseek-chat
```

Anthropic-compatible 示例：

```text
/provider set --protocol anthropic-compatible --base-url https://your-gateway.example/v1/messages --api-key your_key --model claude-3-5-sonnet
```

### 6. 协议说明

#### anthropic-compatible

- 复用项目现有的 Anthropic-compatible 路径
- 适合兼容 Anthropic 消息格式的网关

#### openai-compatible

- 走当前项目内置的最小兼容适配层
- 适合 DeepSeek / OpenRouter / 自建 OpenAI-compatible 网关等
- 当前支持能力以基础文本对话为主

当前 `openai-compatible` **暂不承诺** 完整支持：

- tools / tool calls
- 完整 thinking / reasoning 控制
- 结构化输出全量兼容
- 全量多模态块语义兼容

### 7. 环境变量配置

当前兼容变量如下：

- `XCCODE_PROVIDER_PROTOCOL`
- `XCCODE_BASE_URL`
- `XCCODE_API_KEY`
- `XCCODE_MODEL`
- `XCCODE_USE_OPENAI_COMPATIBLE`

#### PowerShell 示例

```powershell
$env:XCCODE_USE_OPENAI_COMPATIBLE = '1'
$env:XCCODE_BASE_URL = 'https://api.openai.com/v1'
$env:XCCODE_API_KEY = 'your-api-key'
$env:XCCODE_MODEL = 'gpt-4.1-mini'
```

持久化到当前用户环境：

```powershell
[Environment]::SetEnvironmentVariable('XCCODE_USE_OPENAI_COMPATIBLE', '1', 'User')
[Environment]::SetEnvironmentVariable('XCCODE_BASE_URL', 'https://api.openai.com/v1', 'User')
[Environment]::SetEnvironmentVariable('XCCODE_API_KEY', 'your-api-key', 'User')
[Environment]::SetEnvironmentVariable('XCCODE_MODEL', 'gpt-4.1-mini', 'User')
```

#### Bash 示例

```bash
export XCCODE_USE_OPENAI_COMPATIBLE=1
export XCCODE_BASE_URL=https://api.openai.com/v1
export XCCODE_API_KEY=your-api-key
export XCCODE_MODEL=gpt-4.1-mini
```

### 8. 配置文件位置

当前主配置文件：

- 用户级：`~/.xccode/settings.json`
- 项目级：`.xccode/settings.json`
- 本地未提交覆盖：`.xccode/settings.local.json`

当前主规则文件：

- 用户级：`~/.xccode/XCCODE.md`
- 项目级：`./XCCODE.md`

兼容说明：

- 旧的 `CLAUDE.md` 仍有兼容路径
- 新示例优先使用 `XCCODE.md`

### 9. 构建、测试、打包

```bash
npm test
npm run build
npm run pack:check
```

查看帮助：

```bash
node .\dist\cli.js --help
node .\dist\xccodex.js --help
```

### 10. 本地调试

```bash
npm run cli:run
```

单次 prompt：

```bash
npm run cli:run -- -p "Reply with exactly: OK"
```

### 11. 发布 npm 公共包

确认通过构建和打包检查后：

```bash
npm publish --access public
```

当前包名：

```text
xccodex
```

### 12. GitHub

建议公开仓库名称：

```text
ins13014778/xccodex
```

---

## English

`xccodex` is a terminal-first AI coding assistant CLI.

This repository currently includes:

- the `xccodex` one-click launcher
- a first-run interactive setup wizard
- `/provider set|show|clear`
- protocol switching between `anthropic-compatible` and `openai-compatible`
- custom base URL / API key / model configuration
- build / test / pack validation for npm publishing

> Public branding is **xccodex**.
> 
> For implementation compatibility, the current config root and env prefix are still:
>
> - config root: `~/.xccode/`
> - env prefix: `XCCODE_*`
> - rules file: `XCCODE.md`

### Quick start

```bash
npm install
npm run build
node ./dist/xccodex.js
```

### One-click setup scripts

Windows:

```powershell
.\scripts\setup-windows.ps1
```

macOS / Linux:

```bash
bash ./scripts/setup-unix.sh
```

### Start commands

```bash
xccodex
```

or from source:

```bash
node ./dist/xccodex.js
```

Force the wizard again:

```bash
node ./dist/xccodex.js --reconfigure
```

### Configure provider inside the CLI

```text
/provider show
/provider set
/provider clear
```

Example:

```text
/provider set --protocol openai-compatible --base-url https://api.deepseek.com/v1 --api-key your_key --model deepseek-chat
```

### Current config files

- user: `~/.xccode/settings.json`
- project: `.xccode/settings.json`
- local override: `.xccode/settings.local.json`
- user rules: `~/.xccode/XCCODE.md`
- project rules: `./XCCODE.md`

### Build / test / pack

```bash
npm test
npm run build
npm run pack:check
```

### Publish publicly to npm

```bash
npm publish --access public
```

Package name:

```text
xccodex
```
