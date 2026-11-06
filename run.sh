#!/usr/bin/env bash
# Usage:
#   ./run.sh              interactive menu: pick a script by number
#   ./run.sh help         list every script with what it does
#   ./run.sh <name> [args] run a script directly (e.g. ./run.sh account-info)
# Descriptions come from the "// desc:" line at the top of each scripts/*.js.
set -euo pipefail
cd "$(dirname "$0")"

[ -d node_modules ] || npm install --silent

scripts=(scripts/*.js)
name() { basename "$1" .js; }
desc() { sed -n 's#^// desc: ##p' "$1"; }

help() {
  echo "Stellar scripts (run: ./run.sh <name>)"
  echo
  for f in "${scripts[@]}"; do printf '  %-26s %s\n' "$(name "$f")" "$(desc "$f")"; done
}

case "${1:-}" in
  help|-h|--help) help; exit 0 ;;
  "") ;;
  *)
    f="scripts/${1%.js}.js"
    [ -f "$f" ] || { echo "Unknown script: $1" >&2; echo >&2; help >&2; exit 1; }
    shift
    exec node "$f" "$@"
    ;;
esac

i=1
for f in "${scripts[@]}"; do printf '%3d) %-26s %s\n' "$i" "$(name "$f")" "$(desc "$f")"; i=$((i + 1)); done
read -rp "Pick a number (q to quit): " n
[[ "$n" =~ ^[0-9]+$ ]] && [ "$n" -ge 1 ] && [ "$n" -le "${#scripts[@]}" ] || exit 0
exec node "${scripts[$((n - 1))]}"
