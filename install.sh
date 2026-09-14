#!/bin/sh
set -eu

if [ "$#" -gt 2 ]; then
    printf '%s\n' 'Usage: sh install.sh [existing-user-home [absolute-codex-config-home]]' >&2
    exit 2
fi
source_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
user_home=$(CDPATH= cd -- "${1:-$HOME}" && pwd -P)
for file in SKILL.md policy.yaml codex-profile.toml prompts/recover.md; do
    if [ ! -f "$source_dir/$file" ]; then
        printf '%s\n' "Missing $file beside the installer; use a complete repository clone." >&2
        exit 1
    fi
done

codex_config_dir=${2:-${CODEX_HOME:-"$user_home/.codex"}}
case "$codex_config_dir" in /*) ;; *) printf '%s\n' 'CODEX_HOME must be absolute.' >&2; exit 1 ;; esac
profile_path="$codex_config_dir/multi-ai.config.toml"
case "$profile_path" in "$source_dir/"*)
    printf '%s\n' 'The Codex profile must be outside this repository.' >&2; exit 1 ;;
esac
# Quote paths for the hook shell, then escape that command for a TOML string.
skill_path=$(printf '%s' "$user_home/.agents/skills/multi-ai" | sed "s/'/'\\\\''/g")
hook_command="printf '%s\\n' 'Multi-AI skill directory: $skill_path'; cat '$skill_path/prompts/recover.md'"
toml_command=$(printf '%s' "$hook_command" | sed 's/\\/\\\\/g; s/"/\\"/g')
profile=$(cat "$source_dir/codex-profile.toml"; printf 'command = "%s"\n' "$toml_command")

# Check all destinations before writing. Never replace existing data.
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
for relative in .agents/skills/multi-ai .claude/skills/multi-ai; do
    target="$user_home/$relative"
    case "$target/" in "$source_dir/"*)
        printf '%s\n' 'Install destinations must be outside this repository.' >&2
        exit 1 ;;
    esac
    if [ -e "$target" ] || [ -L "$target" ]; then
        if [ ! -L "$target" ] || [ "$(CDPATH= cd -- "$target" && pwd -P)" != "$source_dir" ]; then
            printf '%s\n' "Already exists or links elsewhere: $target. Left unchanged." >&2
            exit 1
        fi
    fi
done
for relative in .agents/skills/multi-ai .claude/skills/multi-ai; do
    target="$user_home/$relative"
    if [ ! -L "$target" ]; then
        mkdir -p -- "$(dirname -- "$target")"
        ln -s -- "$source_dir" "$target"
    fi
    printf '%s\n' "Linked $target -> $source_dir"
done
if [ ! -e "$profile_path" ]; then
    mkdir -p -- "$codex_config_dir"
    printf '%s\n' "$profile" > "$profile_path"
fi
printf '%s\n' "Codex recovery profile: $profile_path"
printf '%s\n' 'Add --profile multi-ai to the saved Codex launcher. Review/trust this hook once in /hooks, then start a new session.'
printf '%s\n' 'Start a new Codex/Claude session to discover multi-ai. Keep this clone; git pull updates the skill.'
