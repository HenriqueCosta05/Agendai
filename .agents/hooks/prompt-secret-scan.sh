#!/usr/bin/env bash
# Shared entry point for the prompt secret scan; the logic lives in prompt-secret-scan.mjs.
. "$(dirname "${BASH_SOURCE[0]}")/_env.sh"
exec node "$(dirname "${BASH_SOURCE[0]}")/prompt-secret-scan.mjs"
