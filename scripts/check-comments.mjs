#!/usr/bin/env node
// Comment budget gate: no comment (block, JSDoc, or run of // lines) may be longer than 2 lines.
//   node scripts/check-comments.mjs                   check src/
//   node scripts/check-comments.mjs --migrate         move long comments to docs/code-notes/ and leave a 1-line pointer
//   node scripts/check-comments.mjs --stdin <relpath> read a Claude hook payload on stdin and check the text about to be written
import { readFileSync, writeFileSync, mkdirSync, appendFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ts, listTsFiles, parse, rel, ROOT } from './lib/ts-utils.mjs';

const MAX_LINES = 2;
const DIRECTIVE = /^\s*(\/\/\s*(eslint|prettier|@ts-|istanbul|c8|vitest)|\/\/\/\s*<)/;

function collectGroups(sf, text) {
  const ranges = new Map();
  const add = (list) => list?.forEach((r) => ranges.set(r.pos, r));
  const visit = (node) => {
    add(ts.getLeadingCommentRanges(text, node.pos));
    add(ts.getTrailingCommentRanges(text, node.end));
    ts.forEachChild(node, visit);
  };
  visit(sf);
  const sorted = [...ranges.values()].sort((a, b) => a.pos - b.pos);
  const groups = [];
  for (const r of sorted) {
    const startLine = sf.getLineAndCharacterOfPosition(r.pos).line;
    const endLine = sf.getLineAndCharacterOfPosition(r.end).line;
    const isLine = r.kind === ts.SyntaxKind.SingleLineCommentTrivia;
    const last = groups[groups.length - 1];
    if (isLine && last && last.isLine && last.endLine + 1 === startLine) {
      last.end = r.end;
      last.endLine = endLine;
      continue;
    }
    groups.push({ pos: r.pos, end: r.end, startLine, endLine, isLine });
  }
  return groups
    .map((g) => ({ ...g, lines: g.endLine - g.startLine + 1, text: text.slice(g.pos, g.end) }))
    .filter((g) => g.lines > MAX_LINES && !DIRECTIVE.test(g.text));
}

function check(file, text) {
  const sf = parse(file, text);
  return { sf, violations: collectGroups(sf, text) };
}

function cleanComment(text) {
  return text
    .split('\n')
    .map((l) => l.replace(/^\s*(\/\*\*?|\*\/|\*|\/\/)\s?/, '').replace(/\*\/\s*$/, '').trimEnd())
    .join('\n')
    .trim();
}

const args = process.argv.slice(2);

if (args[0] === '--stdin') {
  const relPath = args[1] ?? 'unknown.ts';
  const payload = JSON.parse(readFileSync(0, 'utf8'));
  if (!/\.(m|c)?[jt]sx?$/.test(relPath)) process.exit(0);
  const input = payload.tool_input ?? {};
  const snippets = [input.content, input.new_string, ...(input.edits ?? []).map((e) => e.new_string)].filter(
    (s) => typeof s === 'string',
  );
  const problems = [];
  for (const snippet of snippets) {
    const { sf, violations } = check(relPath, snippet);
    for (const v of violations) problems.push(`line ${v.startLine + 1}: ${v.lines}-line comment`);
    void sf;
  }
  if (problems.length) {
    console.error(
      `comments longer than ${MAX_LINES} lines are not allowed in ${relPath} (${problems.join('; ')}). Keep code comments to at most ${MAX_LINES} lines and put longer explanations in docs/ instead.`,
    );
    process.exit(1);
  }
  process.exit(0);
}

const migrate = args.includes('--migrate');
const files = listTsFiles('src');
const report = [];

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const { sf, violations } = check(file, text);
  if (!violations.length) continue;
  const r = rel(file);
  if (!migrate) {
    for (const v of violations) report.push(`${r}:${v.startLine + 1} ${v.lines}-line comment (max ${MAX_LINES})`);
    continue;
  }
  const docRel = `docs/code-notes/${r.replace(/[\\/]/g, '__')}.md`;
  const docAbs = join(ROOT, docRel);
  mkdirSync(dirname(docAbs), { recursive: true });
  if (!existsSync(docAbs)) writeFileSync(docAbs, `# Notes migrated from ${r}\n`);
  let out = text;
  for (const v of [...violations].reverse()) {
    appendFileSync(docAbs, `\n## Line ${v.startLine + 1}\n\n${cleanComment(v.text)}\n`);
    out = out.slice(0, v.pos) + `// See ${docRel}` + out.slice(v.end);
  }
  writeFileSync(file, out);
  report.push(`${r}: migrated ${violations.length} comment(s) to ${docRel}`);
  void sf;
}

if (migrate) {
  console.log(report.length ? report.join('\n') : 'Nothing to migrate.');
  process.exit(0);
}
if (report.length) {
  console.error(`${report.join('\n')}\nRun "npm run comments:migrate" to move them to docs/code-notes/.`);
  process.exit(1);
}
console.log('Comment budget OK.');
