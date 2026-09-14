#!/bin/sh
set -eu

if [ "$#" -gt 1 ]; then
    printf '%s\n' 'Usage: sh install.sh [existing-user-home]' >&2
    exit 2
fi
source_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
user_home=$(CDPATH= cd -- "${1:-$HOME}" && pwd -P)
for file in SKILL.md policy.yaml; do
    if [ ! -f "$source_dir/$file" ]; then
        printf '%s\n' "Missing $file beside the installer; use a complete repository clone." >&2
        exit 1
    fi
done

# Check both destinations before creating either link. Never replace existing data.
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
printf '%s\n' 'Start a new Codex/Claude session to discover multi-ai. Keep this clone; git pull updates the skill.'
