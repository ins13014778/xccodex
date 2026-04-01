# xccodex One-Click Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增加 `xccodex` 一键启动入口，在首次运行时自动完成协议、API 地址、密钥、模型配置并直接启动 `xccode`。

**Architecture:** 新增 `src/entrypoints/xccodex.ts`，用 Node 原生交互向导完成配置。配置继续写入 `~/.xccode/settings.json` 并复用 `/provider` 核心保存逻辑；若配置已完整，则直接转发启动 `xccode`。

**Tech Stack:** TypeScript source tree, Node.js `readline/promises`, existing providerCore persistence, esbuild bundling, node:test.

---

## File Structure

- Create: `D:\claude code nx\claude-code-fixed-main\src\entrypoints\xccodex.ts`
- Create: `D:\claude code nx\claude-code-fixed-main\tests\xccodex-launcher.test.mjs`
- Modify: `D:\claude code nx\claude-code-fixed-main\package.json`
- Modify: `D:\claude code nx\claude-code-fixed-main\scripts\build.mjs`
- Modify: `D:\claude code nx\claude-code-fixed-main\src\commands\provider\providerCore.ts`
- Modify: `D:\claude code nx\claude-code-fixed-main\README.md`
- Modify: `D:\claude code nx\claude-code-fixed-main\docs\BUILD_MANUAL.md`

## Tasks

### Task 1: 为 xccodex 向导写失败测试
- [ ] **Step 1: 写 `tests/xccodex-launcher.test.mjs`**
- [ ] **Step 2: 覆盖这些行为**
  - `package.json` bin 包含 `xccodex`
  - `scripts/build.mjs` 产出 `dist/xccodex.js`
  - `providerCore` 能判断配置是否完整
  - `xccodex` 具有按协议给推荐模型的逻辑
- [ ] **Step 3: 运行测试确认失败**

### Task 2: 实现 xccodex 入口与小白向导
- [ ] **Step 1: 在 `providerCore.ts` 增加配置完整性与推荐模型辅助函数**
- [ ] **Step 2: 新建 `src/entrypoints/xccodex.ts`**
- [ ] **Step 3: 支持已配置直接启动**
- [ ] **Step 4: 支持未配置进入向导**
- [ ] **Step 5: 模型选择同时提供推荐项和自定义输入**

### Task 3: 接入打包与文档
- [ ] **Step 1: `package.json` 增加 `xccodex` bin**
- [ ] **Step 2: `scripts/build.mjs` 同时构建 `cli` 与 `xccodex`**
- [ ] **Step 3: `package.json.files` 放行 `dist/xccodex.js`**
- [ ] **Step 4: README / BUILD_MANUAL 补充 `xccodex` 一键启动说明**

### Task 4: 最终验证并推送 GitHub
- [ ] **Step 1: 运行 `npm test`**
- [ ] **Step 2: 运行 `npm run build`**
- [ ] **Step 3: 运行 `npm run pack:check`**
- [ ] **Step 4: 提交并推送到现有 GitHub 仓库**

