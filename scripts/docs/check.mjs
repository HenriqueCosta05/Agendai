// Checks the Markdown pages in docs/ for AI readability (checks A-1 to A-9 of the ai-readiness skill)
// and for common AI-writing tells (humanizer). Exits 1 when a page fails. A-7 and A-10 are not checked here.
// Usage: npm run docs:check
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT } from '../lib/ts-utils.mjs';

const DOCS = join(ROOT, 'docs');
const GENERIC_HEADINGS = new Set(['overview', 'details', 'introduction', 'notes', 'summary', 'general', 'misc', 'other', 'more info', 'background']);
const VAGUE_LINK_TEXT = new Set(['here', 'below', 'above', 'this page', 'this link', 'link', 'click here', 'see below', 'read more']);
const OPENING_PRONOUN = /^(it|this|they|these|those)\b/i;
const TELLS = [
  /\b(seamless|seamlessly|robust|powerful|leverage|delve|empower|unlock|elevate|streamline|cutting-edge|game-changer)\b/i,
  /\b(in conclusion|in summary|let'?s dive in|in this guide|happy (building|documenting|coding))\b/i,
  /\b(i hope this helps|great question|certainly!)\b/i,
];
const EMOJI = /\p{Extended_Pictographic}/u;

function markdownFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'diagrams' ? [] : markdownFiles(path);
    return name.endsWith('.md') ? [path] : [];
  });
}

// Keeps prose lines only, with the line numbers, and drops fenced code blocks and inline code.
function proseLines(text) {
  let inFence = false;
  return text.split('\n').flatMap((raw, index) => {
    if (/^\s*```/.test(raw)) {
      inFence = !inFence;
      return [];
    }
    if (inFence) return [];
    return [{ n: index + 1, text: raw.replace(/`[^`]*`/g, ''), raw }];
  });
}

function frontmatterDescription(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { found: false };
  const line = match[1].split('\n').find((l) => l.startsWith('description:'));
  return { found: true, value: line ? line.slice('description:'.length).trim() : '' };
}

function sections(lines) {
  const out = [];
  let current = { heading: null, line: 0, body: [] };
  for (const line of lines) {
    if (/^#{1,6}\s/.test(line.text)) {
      out.push(current);
      current = { heading: line.text.replace(/^#+\s*/, '').trim(), line: line.n, body: [] };
    } else {
      current.body.push(line);
    }
  }
  out.push(current);
  return out.filter((s) => s.heading !== null || s.body.some((l) => l.text.trim() !== ''));
}

function tableRows(lines) {
  return lines.filter((l) => /^\s*\|/.test(l.raw));
}

function checkDescription(fm, fails) {
  if (!fm.found || !fm.value) return fails.push(['A-1', 1, 'missing frontmatter description']);
  const length = fm.value.length;
  if (length < 50 || length > 160) fails.push(['A-1', 1, `description is ${length} characters, expected 50 to 160`]);
}

function checkSections(lines, fails) {
  const list = sections(lines);
  list.forEach((section, index) => {
    const next = list[index + 1];
    if (section.heading && GENERIC_HEADINGS.has(section.heading.toLowerCase())) {
      fails.push(['A-3', section.line, `heading "${section.heading}" is too generic`]);
    }
    const hasBody = section.body.some((l) => l.text.trim() !== '');
    if (section.heading && !hasBody && next) {
      fails.push(['A-4', section.line, `heading "${section.heading}" is followed directly by another heading`]);
    }
  });
}

function checkTables(lines, fails) {
  const rows = tableRows(lines);
  let width = null;
  for (const row of rows) {
    const cells = row.raw.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (/^[\s|:-]+$/.test(row.raw)) continue;
    if (width === null) width = cells.length;
    if (cells.length !== width) fails.push(['A-6', row.n, 'table row has a different number of cells than its header']);
    if (cells.some((c) => c === '')) fails.push(['A-6', row.n, 'table has an empty cell; write "None" instead']);
  }
}

function checkOpeningPronouns(lines, fails) {
  let paragraphStart = true;
  for (const line of lines) {
    const text = line.text.trim();
    if (text === '') {
      paragraphStart = true;
      continue;
    }
    const block = /^(#|\||[-*] |\d+\. |>)/.test(text);
    if (paragraphStart && !block && OPENING_PRONOUN.test(text)) {
      fails.push(['A-8', line.n, `paragraph opens with "${text.split(' ')[0]}"; name the subject instead`]);
    }
    paragraphStart = block;
  }
}

function checkLinkText(lines, fails) {
  for (const line of lines) {
    for (const [, label] of line.text.matchAll(/\[([^\]]+)\]\([^)]+\)/g)) {
      if (VAGUE_LINK_TEXT.has(label.trim().toLowerCase())) {
        fails.push(['A-9', line.n, `link text "${label}" does not name its destination`]);
      }
    }
  }
}

function checkTells(lines, fails) {
  for (const line of lines) {
    const match = TELLS.map((re) => line.text.match(re)).find(Boolean);
    if (match) fails.push(['H-1', line.n, `AI-writing phrase "${match[0]}"`]);
    if (EMOJI.test(line.text)) fails.push(['H-2', line.n, 'emoji in documentation']);
    if ((line.text.match(/—/g) ?? []).length >= 2) fails.push(['H-3', line.n, 'two or more em dashes in one line']);
  }
}

function checkFile(file) {
  const text = readFileSync(file, 'utf8');
  const lines = proseLines(text);
  const fails = [];
  checkDescription(frontmatterDescription(text), fails);
  checkSections(lines, fails);
  checkTables(lines, fails);
  checkOpeningPronouns(lines, fails);
  checkLinkText(lines, fails);
  checkTells(lines, fails);
  return fails;
}

const files = markdownFiles(DOCS);
let failed = 0;
for (const file of files) {
  const fails = checkFile(file);
  failed += fails.length;
  for (const [id, line, message] of fails) {
    console.log(`${relative(ROOT, file)}:${line} ${id} ${message}`);
  }
}
console.log(failed === 0 ? `docs:check passed for ${files.length} pages.` : `docs:check found ${failed} problem(s).`);
process.exitCode = failed === 0 ? 0 : 1;
