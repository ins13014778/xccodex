# xccodex One-Click Launcher Design

**Status:** Approved in conversation, pending file review  
**Date:** 2026-04-02

## Goal

为小白用户提供一个“一键启动”入口 `xccodex`，让用户无需手改环境变量或 JSON 文件，也能完成：

- 首次协议选择
- API 地址设置
- API Key 设置
- 模型选择 / 填写
- 配置保存
- 启动 `xccode`

## Problem Statement

当前虽然已经有：

- `xccode`
- `/provider set|show|clear`
- `~/.xccode/settings.json`

但对小白用户来说仍然有这些门槛：

- 不知道什么时候该用 `/provider set`
- 不知道环境变量怎么写
- 不知道模型名如何填
- 不知道协议该选哪种

因此需要一个“直接运行就能配好并启动”的入口。

## Proposed UX

### Command name

新增命令：

```text
xccodex
```

### Behavior

#### Case A: 已有完整配置

如果 `~/.xccode/settings.json` 中已经存在一套完整 provider 配置：

- 直接启动 `xccode`

#### Case B: 未配置或配置不完整

自动进入首次配置向导：

1. 选择协议
   - `anthropic-compatible`
   - `openai-compatible`
2. 填写 base URL
3. 填写 API key
4. 选择/填写 model
5. 保存到 `~/.xccode/settings.json`
6. 自动启动 `xccode`

## Scope

### 本次要做

- 增加 `xccodex` 启动入口
- 增加首次启动配置检测
- 增加最小交互式向导
- 对常见模型选择提供小白友好的默认选项
- 保存配置后自动启动 `xccode`

### 本次不做

- 多协议之外的第三种 provider
- 高级配置界面
- provider 配置历史版本管理
- 工具调用能力增强

## Configuration Source of Truth

继续沿用当前 provider 配置真相源：

```json
{
  "env": {
    "XCCODE_PROVIDER_PROTOCOL": "...",
    "XCCODE_BASE_URL": "...",
    "XCCODE_API_KEY": "...",
    "XCCODE_MODEL": "..."
  }
}
```

位置：

```text
~/.xccode/settings.json
```

`xccodex` 只是“更友好的配置与启动入口”，**不是第二套配置系统**。

## Model Selection Design

这是本功能的重点之一：**模型选择必须让小白容易理解**。

### Protocol-specific recommended model list

#### anthropic-compatible

提供推荐值：

- `claude-3-5-sonnet`
- `claude-sonnet-4-5`
- `claude-sonnet-4-6`

同时允许用户手动输入自定义模型名。

#### openai-compatible

提供常见示例值（说明为“示例，可改”）：

- `deepseek-chat`
- `glm-4.5`
- `qwen-plus`
- `gpt-4.1-mini`

同时允许用户手动输入自定义模型名。

### Input policy

模型选择界面应支持：

1. 选推荐项
2. 选“Custom / 自定义”
3. 手动输入模型名

## Parameter Setup Design

### Required parameters

无论哪种协议，向导都至少配置：

- protocol
- base URL
- API key
- model

### Validation expectations

- protocol 必须在允许列表内
- base URL 不能为空
- API key 不能为空
- model 不能为空

若方便实现，base URL 应额外校验为合法 URL。

## Startup Detection Logic

### Complete config

当以下值都存在时，视为配置完整：

- `XCCODE_PROVIDER_PROTOCOL`
- `XCCODE_BASE_URL`
- `XCCODE_API_KEY`
- `XCCODE_MODEL`

### Incomplete config

只要上述任一缺失，就进入向导。

## Relationship to `/provider`

`xccodex` 不替代 `/provider`。

### `/provider`

- 适合已进入 CLI 的用户
- 支持精确管理与参数直设

### `xccodex`

- 适合首次使用和小白用户
- 目标是“开箱即用”

两者最终都写入同一份 `~/.xccode/settings.json`。

## Technical Direction

推荐做法：

### 1. Package/bin 层增加一个新命令

例如在 `package.json` 的 `bin` 中增加：

```json
{
  "xccode": "dist/cli.js",
  "xccodex": "dist/xccodex.js"
}
```

### 2. 新增独立入口

让 `xccodex`：

- 读取当前 settings
- 判断是否完整
- 不完整则跑配置向导
- 完成后拉起 `xccode`

### 3. 复用已有 provider 配置逻辑

保存逻辑尽量复用已有：

- `/provider` 的核心配置函数

避免重复实现。

## Documentation Requirements

README 后续要补：

- `xccodex` 是什么
- 首次运行会自动进入配置向导
- 与 `/provider` 的关系
- 小白用户推荐用法

## Acceptance Criteria

完成后应满足：

1. 输入 `xccodex` 可启动一键入口
2. 未配置时自动进入向导
3. 向导能设置 protocol / base URL / API key / model
4. 模型选择对小白友好，有推荐项和自定义项
5. 配置保存到 `~/.xccode/settings.json`
6. 配置完成后自动启动 `xccode`
7. 已配置用户再次运行 `xccodex` 时直接启动，不重复打扰

## Notes

- 当前目录已经是 git 仓库，但本设计文档此刻还未单独提交。
