import { Plugin, Skill } from '@opencode/plugin';
import { runHook } from './run-hook.js';

const WRITE_TOOLS = new Set(['write', 'edit', 'patch']);
const PROMPT_GATE = Skill.ID.make('prompt-gate');
export default Plugin.define({
  id: 'agendai.project-gates',
  async setup(ctx) {
    const projectDirectory = ctx.location.directory;
    const registrations = [
      await ctx.session.hook('prompt', async (event) => {
        const scan = await runHook(projectDirectory, 'prompt-secret-scan.sh', { prompt: event.prompt.text }, 15_000);
        if (scan.decision === 'block') throw new Error(scan.reason || 'Prompt blocked by prompt-gate.');
        const skills = event.prompt.skills ?? [];
        if (!skills.some((skill) => skill.id === PROMPT_GATE)) skills.push({ id: PROMPT_GATE });
        event.prompt.skills = skills;
      }),
      await ctx.tool.hook('execute.before', async (event) => {
        if (!WRITE_TOOLS.has(event.tool)) return;
        try {
          const input = hookInput(event.tool, event.input);
          const result = await runHook(projectDirectory, 'pre-tool-gate.sh', { tool_input: input }, 300_000);
          if (result.decision === 'block') throw new Error(result.reason || 'Quality gate blocked the edit.');
        } catch (error) {
          throw new Error(errorMessage(error), { cause: error });
        }
      }),
      await ctx.tool.hook('execute.after', async (event) => {
        if (event.status !== 'completed' || !WRITE_TOOLS.has(event.tool)) return;
        const findings = await reviewChanges(projectDirectory, event.tool, event.input);
        if (!findings.length) return;
        const text = findings.join('\n\n');
        const previous = event.result.content;
        event.result = {
          ...event.result,
          content:
            typeof previous === 'string'
              ? `${previous}\n\n${text}`
              : [...(previous ?? []), { type: 'text', text }],
        };
      }),
    ];
    return async () => {
      await Promise.all(registrations.map((registration) => registration.dispose()));
    };
  },
});

function hookInput(tool: string, value: unknown): Record<string, unknown> {
  const input = asRecord(value);
  const normalized: Record<string, unknown> = { ...input, file_path: tool === 'patch' ? '' : filePath(input) };
  if ('newString' in input) normalized.new_string = input.newString;
  if ('oldString' in input) normalized.old_string = input.oldString;
  if (tool === 'patch') {
    delete normalized.content;
    delete normalized.new_string;
  }
  return normalized;
}

async function reviewChanges(projectDirectory: string, tool: string, value: unknown): Promise<string[]> {
  const findings: string[] = [];
  for (const file of targetFiles(tool, value)) {
    try {
      const result = await runHook(projectDirectory, 'post-tool-review.sh', { tool_input: { file_path: file } }, 60_000);
      if (result.decision === 'block') findings.push(result.reason || `Best-practice review failed for ${file}.`);
    } catch (error) {
      findings.push(`Post-write review could not run for ${file}: ${errorMessage(error)}`);
    }
  }
  return findings;
}

function targetFiles(tool: string, value: unknown): string[] {
  const input = asRecord(value);
  if (tool !== 'patch') return filePath(input) ? [filePath(input)] : [];
  const patch = typeof input.patchText === 'string' ? input.patchText : '';
  const matches = patch.matchAll(/^\*\*\* (?:Add File|Update File|Delete File|Move to):\s*(.+?)\s*$/gm);
  return [...new Set([...matches].map((match) => match[1]))];
}

function filePath(input: Record<string, unknown>): string {
  const candidates = [input.path, input.filePath, input.file_path];
  return candidates.find((value): value is string => typeof value === 'string') ?? '';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? { ...value } : {};
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
