import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

function readSource(relativePath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), 'utf8')
}

function loadProjectOnboardingState(existingInstructionFiles = []) {
  const source = readSource('src/projectOnboardingState.ts')
  const executableSource = source
    .replace(/^[\s\S]*?(?=export type Step)/, '')
    .replace(/export type Step = \{[\s\S]*?\n\}\n\n/, '')
    .replace(/export function /g, 'function ')
    .replace(
      /export const shouldShowProjectOnboarding = /,
      'const shouldShowProjectOnboarding = ',
    )
    .replace(/: Step\[\]/g, '')
    .replace(/: boolean/g, '')
    .replace(/: void/g, '')

  const evaluateModule = new Function(
    'memoize',
    'join',
    'getCurrentProjectConfig',
    'saveCurrentProjectConfig',
    'getCwd',
    'isDirEmpty',
    'getFsImplementation',
    `${executableSource}
return {
  getSteps,
  isProjectOnboardingComplete,
  maybeMarkProjectOnboardingComplete,
  shouldShowProjectOnboarding,
  incrementProjectOnboardingSeenCount,
}
`,
  )

  const existsSyncCalls = []

  const moduleExports = evaluateModule(
    fn => fn,
    path.join,
    () => ({
      hasCompletedProjectOnboarding: false,
      projectOnboardingSeenCount: 0,
    }),
    () => {},
    () => '/repo',
    () => false,
    () => ({
      existsSync: filePath => {
        existsSyncCalls.push(filePath)
        return existingInstructionFiles.includes(filePath)
      },
    }),
  )

  return {
    ...moduleExports,
    existsSyncCalls,
  }
}

function getInstructionStep(existingInstructionFiles = []) {
  const { getSteps, existsSyncCalls } = loadProjectOnboardingState(
    existingInstructionFiles,
  )
  return {
    instructionStep: getSteps().find(step => step.key === 'claudemd'),
    existsSyncCalls,
  }
}

test('onboarding copy references xccode and XCCODE.md', () => {
  const { instructionStep } = getInstructionStep()
  const { getSteps } = loadProjectOnboardingState()

  assert.equal(
    getSteps()[0]?.text,
    'Ask xccode to create a new app or clone a repository',
  )
  assert.equal(
    instructionStep?.text,
    'Run /init to create a XCCODE.md file with instructions for xccode',
  )
})

test('project onboarding treats XCCODE.md as the default instruction file', () => {
  const { instructionStep } = getInstructionStep([path.join('/repo', 'XCCODE.md')])

  assert.equal(instructionStep?.isComplete, true)
})

test('project onboarding falls back to CLAUDE.md when XCCODE.md is absent', () => {
  const { instructionStep } = getInstructionStep([path.join('/repo', 'CLAUDE.md')])

  assert.equal(instructionStep?.isComplete, true)
})

test('project onboarding remains incomplete when neither instruction file exists', () => {
  const { instructionStep } = getInstructionStep()

  assert.equal(instructionStep?.isComplete, false)
})

test('project onboarding checks only XCCODE.md when both rule files exist', () => {
  const xccodePath = path.join('/repo', 'XCCODE.md')
  const claudePath = path.join('/repo', 'CLAUDE.md')
  const { instructionStep, existsSyncCalls } = getInstructionStep([
    xccodePath,
    claudePath,
  ])

  assert.equal(instructionStep?.isComplete, true)
  assert.deepEqual(existsSyncCalls, [xccodePath])
})

test('project onboarding checks XCCODE.md before falling back to CLAUDE.md', () => {
  const xccodePath = path.join('/repo', 'XCCODE.md')
  const claudePath = path.join('/repo', 'CLAUDE.md')
  const { instructionStep, existsSyncCalls } = getInstructionStep([claudePath])

  assert.equal(instructionStep?.isComplete, true)
  assert.deepEqual(existsSyncCalls, [xccodePath, claudePath])
})

test('main help copy points to XCCODE.md and xccode', () => {
  const text = readSource('src/main.tsx')

  assert.match(text, /XCCODE\.md auto-discovery/)
  assert.match(text, /--add-dir \(XCCODE\.md dirs\)/)
  assert.match(
    text,
    /"# xccode up" section of the nearest XCCODE\.md/,
  )
})

test('memory selector defaults to XCCODE.md paths', () => {
  const text = readSource('src/components/memory/MemoryFileSelector.tsx')

  assert.match(text, /join\(getClaudeConfigHomeDir\(\), "XCCODE\.md"\)/)
  assert.match(text, /join\(getOriginalCwd\(\), "XCCODE\.md"\)/)
  assert.match(text, /Saved in ~\/\.xccode\/XCCODE\.md/)
  assert.match(text, /\.\/*XCCODE\.md/)
})

test('hook settings use branded xccode copy', () => {
  const text = readSource('src/utils/hooks/hooksSettings.ts')

  assert.match(text, /User settings \(~\/\.xccode\/settings\.json\)/)
  assert.match(text, /Project settings \(\.xccode\/settings\.json\)/)
  assert.match(text, /Local settings \(\.xccode\/settings\.local\.json\)/)
  assert.match(
    text,
    /Plugin hooks \(~\/\.xccode\/plugins\/\*\/hooks\/hooks\.json\)/,
  )
  assert.match(text, /Built-in hooks \(registered internally by xccode\)/)
})
