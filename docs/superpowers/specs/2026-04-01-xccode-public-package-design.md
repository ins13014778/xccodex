# xccode Public Package Design

**Status:** Approved in conversation, pending file review  
**Date:** 2026-04-01

## Goal

把当前项目从 `Claude Code` 风格恢复工程整理为可公开发布的 `xccode` npm CLI，并在第一版中支持：

- 对外统一品牌为 `xccode`
- 公开 npm 安装与运行
- 主规则文件切换为 `XCCODE.md`
- 配置目录与环境变量品牌化为 `xccode`
- 接入 OpenAI-compatible 基础对话能力

## Non-Goals (v1)

第一版不追求：

- 完整还原或兼容所有 Claude 专属能力
- OpenAI-compatible 的完整工具调用兼容
- 所有 provider 的统一抽象重构到最终形态
- 复杂迁移向导或跨版本自动迁移工具

## Product Naming

- **显示名**：`xccode`
- **npm 包名**：`xccode`
- **命令名**：`xccode`

## Publishing Target

公开发布到 npm registry，目标用户安装方式：

```bash
npm install -g xccode
```

启动方式：

```bash
xccode
```

## Branding Scope

### 必改

- `package.json` 中的包名、描述、bin 命令
- 所有用户可见 UI 中的 `Claude Code`
- README / 构建说明 / 配置说明中的旧品牌
- 启动器脚本中的默认目录与对外文案

### 允许保留内部历史痕迹

第一版允许在部分内部实现层保留旧模块名、旧注释或旧抽象，只要不影响：

- 用户看到的品牌
- 用户配置方式
- 用户安装与运行方式

## Config & File Naming

### 配置目录

主配置目录切换为：

```text
~/.xccode/
```

第一版面向用户的文档、帮助信息、默认路径全部使用该目录。

### 设置文件

默认设置文件路径：

```text
~/.xccode/settings.json
```

### 规则文件

主规则文件改为：

```text
XCCODE.md
```

兼容策略：

1. 优先读取 `XCCODE.md`
2. 若不存在，再回退读取 `CLAUDE.md`

这样旧项目仍可被读取，新项目统一生成 `XCCODE.md`。

## Environment Variable Branding

第一版对外统一采用 `XCCODE_*` 风格，不再要求用户继续记忆 `CLAUDE_*` 作为主入口。

建议暴露的最小变量集：

- `XCCODE_CONFIG_DIR`
- `XCCODE_USE_OPENAI_COMPATIBLE`
- `XCCODE_BASE_URL`
- `XCCODE_API_KEY`
- `XCCODE_MODEL`

### 配置优先级

建议优先级：

1. 当前进程环境变量
2. `~/.xccode/settings.json` 中的 `env`
3. 兼容读取的旧值（仅在实现层保底使用，文档不主推）

### 示例：PowerShell

```powershell
$env:XCCODE_USE_OPENAI_COMPATIBLE="1"
$env:XCCODE_BASE_URL="https://api.deepseek.com"
$env:XCCODE_API_KEY="your_key"
$env:XCCODE_MODEL="deepseek-chat"
xccode
```

### 示例：settings.json

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

## OpenAI-Compatible Support (v1)

### v1 范围

第一版只保证：

- 基础对话
- 多轮消息传递
- 基础流式输出
- 自定义 `base_url` / `api_key` / `model`

### 明确不保证

第一版不承诺完整兼容：

- 工具调用
- Claude 专属 message block 行为
- 完整 token/usage 统计对齐
- 所有模型能力探测

## Architecture Recommendation

### 推荐路线

保留现有 Anthropic 风格主路径，新增一个 **OpenAI-compatible adapter**。

逻辑形态：

```text
xccode 主流程
  -> provider 判断
  -> OpenAI-compatible adapter
  -> OpenAI-compatible HTTP API
```

### 为什么不直接改 base URL

因为当前项目核心使用的是 Anthropic SDK / Anthropic 风格消息语义，而 OpenAI-compatible API 通常使用：

- `/v1/chat/completions`
- 或 `/v1/responses`

请求格式、流式 chunk、返回结构均不同，不能仅通过替换 `base_url` 解决。

### 为什么不直接做全量 provider 重构

因为当前项目大量逻辑默认客户端为 Anthropic 风格对象。第一版若直接全量统一抽象，工程风险过高，不利于快速落地公开版本。

## Implementation Boundaries

### 需要修改的高层模块

- `package.json`
- `README.md`
- `scripts/run-recovered-cli.mjs`
- 规则文件生成与扫描逻辑
- 用户配置目录与 settings 路径逻辑
- provider 判断逻辑
- API client 分流逻辑
- 用户可见 UI 文案

### 需要新增的模块

建议新增：

- OpenAI-compatible client
- OpenAI-compatible adapter
- 相关 env/config 解析工具
- 相关最小验证脚本或测试

## Compatibility Strategy

### 保留兼容

- 继续兼容读取 `CLAUDE.md`
- 实现层可暂时兼容部分旧配置来源，避免第一版完全炸裂

### 不主推兼容

文档、提示、安装说明、配置说明统一只写 `xccode` 新命名，不再引导用户使用旧品牌入口。

## Documentation Requirements

README 第一版必须覆盖：

1. 安装方式
2. 启动方式
3. `~/.xccode/settings.json` 配置方式
4. PowerShell / Bash 环境变量配置方式
5. OpenAI-compatible 配置示例
6. 常见问题
7. `XCCODE.md` 与 `CLAUDE.md` 的兼容说明

## Risks

### 高风险

- 配置目录切换导致旧设置丢失感知
- 环境变量品牌切换导致旧脚本失效
- 规则文件名切换影响 `/init` 与规则扫描
- OpenAI-compatible 的流式兼容与消息结构兼容

### 中风险

- UI 改名后仍残留旧品牌文案
- 文档与实际默认路径不一致
- npm 发布前包内容未清理干净

## Suggested Rollout Order

1. 完成品牌与包发布层改名
2. 切换配置目录与 settings 默认路径
3. 切换规则文件到 `XCCODE.md` 并保留 `CLAUDE.md` 兼容读取
4. 新增 OpenAI-compatible 基础对话支持
5. 补全 README 与发布准备

## Acceptance Criteria

当以下条件全部满足时，视为 v1 达成：

1. `npm pack` 可成功生成公开包产物
2. 用户可通过 `npm install -g xccode` 的发布配置进行安装（发布前本地验证等价）
3. CLI 显示名与命令名均为 `xccode`
4. `/init` 及相关提示默认使用 `XCCODE.md`
5. 若只有 `CLAUDE.md`，仍能被读取
6. 默认配置目录为 `~/.xccode/`
7. 用户可通过 `XCCODE_BASE_URL` / `XCCODE_API_KEY` / `XCCODE_MODEL` 完成 OpenAI-compatible 基础对话
8. README 能独立指导新用户完成安装、配置、启动

## Notes

- 当前目录不是 git 仓库，故本规格文件暂无法按标准流程提交 commit。
- 进入实现前应先基于本规格生成实施计划。
