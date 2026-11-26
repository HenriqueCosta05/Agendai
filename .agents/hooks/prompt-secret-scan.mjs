#!/usr/bin/env node
// Shared prompt check (Claude Code and OpenCode): blocks prompts that carry credentials or personal data.
import { readFileSync } from 'node:fs';
import process from 'node:process';

const SENSITIVE_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /AKIA[0-9A-Z]{16}/i,
  /gh[pousr]_[A-Za-z0-9]{36,}/i,
  /github_pat_[A-Za-z0-9_]{50,}/i,
  /sk-[A-Za-z0-9_-]{20,}/i,
  /xox[baprs]-[A-Za-z0-9-]{10,}/i,
  /AIza[0-9A-Za-z_-]{35}/i,
  /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/i,
  /[a-z]+:\/\/[^/\s:@]+:[^/\s@]{3,}@[^\s]+/i,
  /(password|passwd|pwd|secret|api[_-]?key|token|access[_-]?key)["'\s]*[:=]["'\s]*[A-Za-z0-9/+_.!@#$%^&*-]{8,}/i,
  /\b[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}\b/,
  /\b([0-9]{4}[ -]?){3}[0-9]{4}\b/,
];

const { prompt = '' } = JSON.parse(readFileSync(0, 'utf8') || '{}');
if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(String(prompt)))) {
  process.stdout.write(
    JSON.stringify({
      decision: 'block',
      reason:
        'Prompt blocked by prompt-gate: it appears to contain a credential or sensitive data (key, token, password, connection string, private key, CPF or card number). Remove it, rotate it if it is real, and refer to it through an environment variable instead.',
    }),
  );
}
