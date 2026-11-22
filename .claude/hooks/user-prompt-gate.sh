#!/usr/bin/env bash
# UserPromptSubmit: (1) hard-block prompts that contain credentials,
# (2) otherwise inject an instruction to run the mandatory prompt-gate skill.
set -u
input="$(cat)"
prompt="$(printf '%s' "$input" | jq -r '.prompt // ""')"

patterns=(
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'
  'AKIA[0-9A-Z]{16}'
  'gh[pousr]_[A-Za-z0-9]{36,}'
  'github_pat_[A-Za-z0-9_]{50,}'
  'sk-[A-Za-z0-9_-]{20,}'
  'xox[baprs]-[A-Za-z0-9-]{10,}'
  'AIza[0-9A-Za-z_-]{35}'
  'eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'
  '[a-z]+://[^/[:space:]:@]+:[^/[:space:]@]{3,}@[^[:space:]]+'
  '(password|passwd|pwd|secret|api[_-]?key|token|access[_-]?key)["'\'' ]*[:=]["'\'' ]*[A-Za-z0-9/+_.!@#$%^&*-]{8,}'
  '\b[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}\b'
  '\b([0-9]{4}[ -]?){3}[0-9]{4}\b'
)

for p in "${patterns[@]}"; do
  if printf '%s' "$prompt" | grep -Eiq -- "$p"; then
    jq -n '{decision:"block",reason:"Prompt blocked by prompt-gate: it appears to contain a credential or sensitive data (key, token, password, connection string, private key, CPF or card number). Remove it, rotate it if it is real, and refer to it through an environment variable instead."}'
    exit 0
  fi
done

jq -n '{hookSpecificOutput:{hookEventName:"UserPromptSubmit",additionalContext:"MANDATORY: before doing anything else, invoke the `prompt-gate` skill with the Skill tool, follow it (understand the expectation, check for credentials/sensitive data, apply the NestJS/PostgreSQL/Docker guardrails), then proceed with the task."}}'
