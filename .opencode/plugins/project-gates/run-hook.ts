import { spawn } from 'node:child_process';
import { join } from 'node:path';

export interface HookDecision {
  decision?: string;
  reason?: string;
}

const hooksDirectory = join(import.meta.dirname, '../../hooks');

export async function runHook(
  projectDirectory: string,
  script: string,
  payload: Record<string, unknown>,
  timeout: number,
): Promise<HookDecision> {
  const stdout = await execute(projectDirectory, script, payload, timeout);
  if (!stdout.trim()) return {};
  try {
    return JSON.parse(stdout) as HookDecision;
  } catch {
    throw new Error(`${script} returned an invalid JSON response.`);
  }
}

function execute(
  projectDirectory: string,
  script: string,
  payload: Record<string, unknown>,
  timeout: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(join(hooksDirectory, script), {
      cwd: projectDirectory,
      env: { ...process.env, OPENCODE_PROJECT_DIR: projectDirectory },
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (code === 0) return resolve(stdout);
      const detail = stderr.trim() || stdout.trim();
      reject(new Error(`${script} failed (${signal ?? code})${detail ? `: ${detail}` : ''}`));
    });
    child.stdin.end(JSON.stringify(payload));
  });
}
