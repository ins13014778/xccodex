import { mkdir, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, '..');
const configDir = path.join(projectDir, '.xccode-recovery');
const cliPath = path.join(projectDir, 'dist', 'cli.js');
const globalSettingsPath = path.join(os.homedir(), '.xccode', 'settings.json');
const legacyGlobalSettingsPath = path.join(os.homedir(), '.claude', 'settings.json');

await mkdir(configDir, { recursive: true });

async function loadSettingsEnvFromPath(settingsPath) {
  try {
    const raw = await readFile(settingsPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { hasValidSettings: false, env: {} };
    }
    if (!('env' in parsed) || parsed.env == null) {
      return { hasValidSettings: true, env: {} };
    }
    if (typeof parsed.env === 'object' && !Array.isArray(parsed.env)) {
      return { hasValidSettings: true, env: parsed.env };
    }
  } catch {
    return { hasValidSettings: false, env: {} };
  }

  return { hasValidSettings: false, env: {} };
}

async function loadGlobalSettingsEnv() {
  if (
    process.env.XCCODE_SKIP_GLOBAL_ENV === '1' ||
    process.env.CLAUDE_RECOVERY_SKIP_GLOBAL_ENV === '1'
  ) {
    return {};
  }

  const globalSettings = await loadSettingsEnvFromPath(globalSettingsPath);
  if (globalSettings.hasValidSettings) {
    return globalSettings.env;
  }

  const legacySettings = await loadSettingsEnvFromPath(legacyGlobalSettingsPath);
  return legacySettings.hasValidSettings ? legacySettings.env : {};
}

const globalSettingsEnv = await loadGlobalSettingsEnv();
const env = { ...process.env };
for (const [key, value] of Object.entries(globalSettingsEnv)) {
  if (!(key in env) && value != null) {
    env[key] = String(value);
  }
}
env.XCCODE_CONFIG_DIR = configDir;
env.CLAUDE_CONFIG_DIR ??= configDir;

const child = spawn(process.execPath, [cliPath, ...process.argv.slice(2)], {
  cwd: projectDir,
  env,
  stdio: 'inherit',
});

child.on('exit', code => {
  process.exit(code ?? 0);
});

child.on('error', error => {
  console.error(error);
  process.exit(1);
});
