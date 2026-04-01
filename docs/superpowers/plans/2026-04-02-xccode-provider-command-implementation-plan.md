# xccode Provider Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `xccode` 增加 `/provider set|show|clear` 命令，支持 `anthropic-compatible` 与 `openai-compatible` 协议切换，并把配置持久化到 `~/.xccode/settings.json`。

**Architecture:** 命令层新增一个专用 `/provider` 入口。配置统一以 `XCCODE_PROVIDER_PROTOCOL` / `XCCODE_BASE_URL` / `XCCODE_API_KEY` / `XCCODE_MODEL` 为持久化真相源，Anthropic-compatible 通过运行时桥接映射到现有 `ANTHROPIC_*` 路径，OpenAI-compatible 继续走现有最小适配层。

**Tech Stack:** TypeScript source tree, local/local-jsx command framework, settings persistence via `updateSettingsForSource('userSettings', ...)`, existing `TextInput` / `Select` components, node:test.

---

## File Structure

### New files

- `D:\claude code nx\claude-code-fixed-main\src\commands\provider\index.ts`
- `D:\claude code nx\claude-code-fixed-main\src\commands\provider\provider.tsx`
- `D:\claude code nx\claude-code-fixed-main\src\commands\provider\providerCore.ts`
- `D:\claude code nx\claude-code-fixed-main\tests\provider-command.test.mjs`

### Existing files to modify

- `D:\claude code nx\claude-code-fixed-main\src\commands.ts`
- `D:\claude code nx\claude-code-fixed-main\src\utils\managedEnv.ts`
- `D:\claude code nx\claude-code-fixed-main\src\utils\managedEnvConstants.ts`
- `D:\claude code nx\claude-code-fixed-main\README.md` (if help text/example needs a minimal sync)

---

### Task 1: 先写 `/provider` 的失败测试与参数解析核心

**Files:**
- Create: `D:\claude code nx\claude-code-fixed-main\tests\provider-command.test.mjs`
- Create: `D:\claude code nx\claude-code-fixed-main\src\commands\provider\providerCore.ts`

- [ ] **Step 1: 写失败测试，锁定协议、参数、掩码显示与清除行为**
- [ ] **Step 2: 运行测试，确认当前失败**
- [ ] **Step 3: 在 `providerCore.ts` 中实现参数解析与展示/清除的最小纯函数**
- [ ] **Step 4: 重新运行测试，确认核心逻辑通过**

### Task 2: 接入命令注册与交互式 `/provider set`

**Files:**
- Create: `D:\claude code nx\claude-code-fixed-main\src\commands\provider\index.ts`
- Create: `D:\claude code nx\claude-code-fixed-main\src\commands\provider\provider.tsx`
- Modify: `D:\claude code nx\claude-code-fixed-main\src\commands.ts`

- [ ] **Step 1: 写命令注册测试或现有命令可见性测试**
- [ ] **Step 2: 在 `commands.ts` 注册 `provider` 命令**
- [ ] **Step 3: 实现 `/provider show` 与 `/provider clear`**
- [ ] **Step 4: 实现 `/provider set`：参数齐全则直接保存，参数不全则进入交互式补齐**
- [ ] **Step 5: 运行测试并确认命令逻辑通过**

### Task 3: 把持久化配置桥接到当前运行时

**Files:**
- Modify: `D:\claude code nx\claude-code-fixed-main\src\utils\managedEnv.ts`
- Modify: `D:\claude code nx\claude-code-fixed-main\src\utils\managedEnvConstants.ts`
- Test: `D:\claude code nx\claude-code-fixed-main\tests\provider-command.test.mjs`

- [ ] **Step 1: 写失败测试，锁定 `XCCODE_PROVIDER_PROTOCOL` 到运行时 env 的桥接行为**
- [ ] **Step 2: `anthropic-compatible` 桥接到现有 `ANTHROPIC_*` 路径**
- [ ] **Step 3: `openai-compatible` 维持 `XCCODE_*` 路径，并打开 `XCCODE_USE_OPENAI_COMPATIBLE`**
- [ ] **Step 4: 运行测试验证两种协议切换都能得到正确 env**

### Task 4: 最终验证与最小文档同步

**Files:**
- Modify if needed: `D:\claude code nx\claude-code-fixed-main\README.md`
- Test: `D:\claude code nx\claude-code-fixed-main\tests\provider-command.test.mjs`

- [ ] **Step 1: 运行 `npm test`**
- [ ] **Step 2: 运行 `npm run build`**
- [ ] **Step 3: 运行 `npm run pack:check`**
- [ ] **Step 4: 如有必要，在 README 追加 `/provider` 的最小用法示例**

---

## Self-Review

- 覆盖协议切换：有
- 覆盖参数直设与交互：有
- 覆盖持久化与显示掩码：有
- 覆盖 Anthropic-compatible 不重做、只桥接：有
- 未越界到新协议或工具调用增强：有

