#!/usr/bin/env bash
# OpenCode adapter: runs the shared post-write review in .agents/hooks.
exec "$(dirname "${BASH_SOURCE[0]}")/../../.agents/hooks/post-tool-review.sh"
