# xccode Provider Command Design

**Status:** Approved in conversation, pending file review  
**Date:** 2026-04-02

## Goal

为 `xccode` 新增一个持久化的 provider 配置命令，让用户可以在 CLI 内保存并管理当前协议、API 地址、密钥和模型，而不必手动编辑 `~/.xccode/settings.json`。

## Scope

本次只新增“**配置入口**”，不重复实现现有协议能力。

### 已有能力

- `anthropic-compatible`：项目本身已具备，不需要重做
- `openai-compatible`：已在此前任务中加入最小兼容层

### 本次新增

- `/provider set`
- `/provider show`
- `/provider clear`

## Command Design

### `/provider set`

支持两种使用方式：

#### 1. 交互式

逐步询问：

1. protocol
2. base URL
3. API key
4. model

#### 2. 参数直设

示例：

```text
/provider set --protocol openai-compatible --base-url https://api.deepseek.com/v1 --api-key xxx --model deepseek-chat
```

参数形态建议：

- `--protocol`
- `--base-url`
- `--api-key`
- `--model`

### `/provider show`

显示当前生效的持久化 provider 配置：

- protocol
- base URL
- model
- API key（掩码形式）

例如：

```text
Protocol: openai-compatible
Base URL: https://api.deepseek.com/v1
Model: deepseek-chat
API Key: sk-****
```

### `/provider clear`

清空本命令管理的 provider 配置项。

## Supported Protocols

第一版只支持：

- `anthropic-compatible`
- `openai-compatible`

## Persistence Model

配置统一写入：

```text
~/.xccode/settings.json
```

写入 `env` 字段。

建议键名：

- `XCCODE_PROVIDER_PROTOCOL`
- `XCCODE_BASE_URL`
- `XCCODE_API_KEY`
- `XCCODE_MODEL`

示例：

```json
{
  "env": {
    "XCCODE_PROVIDER_PROTOCOL": "openai-compatible",
    "XCCODE_BASE_URL": "https://api.deepseek.com/v1",
    "XCCODE_API_KEY": "your_key",
    "XCCODE_MODEL": "deepseek-chat"
  }
}
```

## Runtime Resolution

### anthropic-compatible

当协议为 `anthropic-compatible` 时：

- 使用项目现有的 Anthropic 路径
- 不重复发明新的 provider 实现

### openai-compatible

当协议为 `openai-compatible` 时：

- 使用当前已经实现的最小 OpenAI-compatible 适配层

## Validation Rules

### `protocol`

必须是：

- `anthropic-compatible`
- `openai-compatible`

### `base-url`

第一版要求为非空字符串。  
如能方便校验，则建议要求是合法 URL；否则在实现中至少保证不是空值。

### `api-key`

必须为非空字符串。  
显示时必须做掩码处理，不可原样回显。

### `model`

必须为非空字符串。

## Behavior Rules

### `set`

- 参数给全时：直接保存
- 参数不全时：进入交互式补齐
- 若协议变更，应允许覆盖旧配置

### `show`

- 仅显示当前已保存的 provider 配置
- 若未设置，明确提示未配置

### `clear`

- 清空 `XCCODE_PROVIDER_PROTOCOL`
- 清空 `XCCODE_BASE_URL`
- 清空 `XCCODE_API_KEY`
- 清空 `XCCODE_MODEL`

## Error Handling

### 输入错误

- 未知协议：报错并给出合法值
- 缺少必要参数：进入交互式或给出明确错误
- 空字符串值：拒绝写入

### 显示错误

- 不得在 `show` 中暴露明文 API key

## Integration Notes

### 与现有 `/config`

`/provider` 是协议配置的专门入口，不替代 `/config` 的通用配置职责。

### 与现有 settings 写入能力

实现应优先复用已有的：

- `updateSettingsForSource('userSettings', ...)`

避免自己手写 JSON 文件更新逻辑。

## Documentation Requirements

README 后续应补充：

- `/provider set`
- `/provider show`
- `/provider clear`
- 协议说明
- 参数直设示例

## Non-Goals

本次不做：

- 新增第三种协议
- 重做 `anthropic-compatible`
- 工具调用兼容增强
- thinking / structured output / 多模态支持
- 大规模设置 UI 改造

## Acceptance Criteria

当以下条件全部满足时，视为完成：

1. 用户可通过 `/provider set` 保存配置
2. `/provider set` 同时支持交互式与参数直设
3. `/provider show` 可正确显示当前配置并掩码 API key
4. `/provider clear` 可清空已保存 provider 配置
5. 配置写入 `~/.xccode/settings.json`
6. 仅支持 `anthropic-compatible` 与 `openai-compatible`
7. 不会重复实现 Anthropic-compatible
8. 测试与构建验证通过

## Notes

- 当前目录不是 git 仓库，因此该规格文件无法按标准流程 commit。
