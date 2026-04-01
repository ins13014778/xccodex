# xccodex One-Click Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增加 `xccodex` 一键启动入口，在首次运行时自动完成协议、地址、密钥、模型配置并启动 `xccode`。

**Architecture:** 使用单独入口 `src/entrypoints/xccodex.ts`，通过 `readline/promises` 实现轻量交互式向导。配置仍统一写入 `~/.xccode/settings.json` 的 `env`，并复用已有 `/provider` 核心保存逻辑。若配置完整，则直接启动 `xccode` 主入口。

**Tech Stack:** TypeScript source tree, Node.js `readline/promises`, existing providerCore settings persistence, esbuild bundling, node:test.

---

## File Structure

- Create: `D:\claude code nx\claude-code-fixed-main\src\entrypoints\xccodex.ts`
- Create: `D:\claude code nx\claude-code-fixed-main\tests\xccodex-launcher.test.mjs`
- Modify: `D:\claude code nx\claude-code-fixed-main\package.json`
- Modify: `D:\claude code nx\claude-code-fixed-main\scripts\build.mjs`
- Modify: `D:\claude code nx\claude-code-fixed-main\src\commands\provider\providerCore.ts`
- Modify: `D:\claude code nx\claude-code-fixed-main\README.md`

## Tasks

### Task 1: 测试先行，定义 xccodex 的启动与配置契约
- [ ] 写失败测试：`xccodex` bin 存在、入口文件存在、完整配置时直接启动、配置缺失时进入向导路径
- [ ] 运行测试确认失败

### Task 2: 实现 xccodex 入口与首次配置向导
- [ ] 新建 `src/entrypoints/xccodex.ts`
- [ ] 支持配置检测
- [ ] 支持协议选择、base URL、API key、model 输入
- [ ] 支持小白友好的推荐模型菜单 + 自定义模型输入
- [ ] 保存配置并启动 `xccode`

### Task 3: 接上打包与文档
- [ ] `package.json` 增加 bin：`xccodex`
- [ ] `scripts/build.mjs` 增加 `dist/xccodex.js`
- [ ] `package.json.files` 白名单纳入 `dist/xccodex.js`
- [ ] README 增加 `xccodex` 一键启动说明

### Task 4: 最终验证并推送 GitHub
- [ ] 运行 `npm test`
- [ ] 运行 `npm run build`
- [ ] 运行 `npm run pack:check`
- [ ] 提交并推送到 GitHub

