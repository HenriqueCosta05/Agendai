#!/usr/bin/env bash
# Shared setup for agent hooks: project root and a working node.
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-${OPENCODE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}}"
export PROJECT_DIR

if ! command -v node >/dev/null 2>&1; then
  for d in "$HOME"/.nvm/versions/node/*/bin "$HOME/.local/share/fnm/aliases/default/bin" \
           "$HOME/.volta/bin" "$HOME/.local/bin" /usr/local/bin; do
    [ -x "$d/node" ] && PATH="$d:$PATH" && break
  done
  export PATH
fi

# Shared hooks answer {"decision":"block","reason":...}; adapters translate it.
deny() {
  jq -n --arg r "$1" '{decision:"block",reason:$r}'
  exit 0
}
