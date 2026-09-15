#!/bin/sh
# Global skill installation via the existing skills CLI; recovery is optional.
set -eu

recovery_profile=false
if [ "${1:-}" = --recovery-profile ]; then recovery_profile=true; shift; fi
if [ "$#" -gt 1 ] || { [ "$#" -eq 1 ] && [ "$recovery_profile" = false ]; }; then
    printf '%s\n' 'Usage: sh install.sh [--recovery-profile [absolute-codex-config-home]]' >&2
    exit 2
fi
npx --yes skills add https://github.com/hyunyul-XCENA/multi-ai/tree/dev --skill multi-ai --agent codex claude-code --global --yes
npm install --global --install-links --ignore-scripts --no-audit --no-fund "$HOME/.agents/skills/multi-ai"
printf '%s\n' 'Installed multi-ai globally for Codex and Claude Code. Start a new session on this host.'
printf '%s\n' 'Host policy: multi-ai-cli tui | multi-ai-cli show | multi-ai-cli set <path> <value>'
if [ "$recovery_profile" = false ]; then exit 0; fi

source_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
for file in SKILL.md policy.yaml codex-profile.toml prompts/recover.md; do
    if [ ! -f "$source_dir/$file" ]; then
        printf '%s\n' "Missing $file beside the installer; use a complete repository clone." >&2
        exit 1
    fi
done

codex_config_dir=${1:-${CODEX_HOME:-"$HOME/.codex"}}
case "$codex_config_dir" in /*) ;; *) printf '%s\n' 'CODEX_HOME must be absolute.' >&2; exit 1 ;; esac
profile_path="$codex_config_dir/multi-ai.config.toml"
case "$profile_path" in "$source_dir/"*)
    printf '%s\n' 'The Codex profile must be outside this repository.' >&2; exit 1 ;;
esac
# Quote paths for the hook shell, then escape that command for a TOML string.
skill_path=$(printf '%s' "$HOME/.agents/skills/multi-ai" | sed "s/'/'\\\\''/g")
hook_command="printf '%s\\n' 'Multi-AI skill directory: $skill_path'; cat '$skill_path/prompts/recover.md'"
toml_command=$(printf '%s' "$hook_command" | sed 's/\\/\\\\/g; s/"/\\"/g')
profile=$(cat "$source_dir/codex-profile.toml"; printf 'command = "%s"\n' "$toml_command")

# Never replace an existing profile or modify the base configuration.
if [ -e "$codex_config_dir" ] && [ ! -d "$codex_config_dir" ]; then
    printf '%s\n' "Not a Codex configuration directory: $codex_config_dir. Left unchanged." >&2
    exit 1
fi
if [ -e "$profile_path" ] || [ -L "$profile_path" ]; then
    if [ ! -f "$profile_path" ] || [ -L "$profile_path" ] || [ "$(cat "$profile_path")" != "$profile" ]; then
        printf '%s\n' "Already exists with different content: $profile_path. Left unchanged." >&2
        exit 1
    fi
fi
if [ ! -e "$profile_path" ]; then
    mkdir -p -- "$codex_config_dir"
    printf '%s\n' "$profile" > "$profile_path"
fi
printf '%s\n' "Codex recovery profile: $profile_path"
printf '%s\n' 'Add --profile multi-ai to the saved Codex launcher. Review/trust this hook once in /hooks, then start a new session.'
