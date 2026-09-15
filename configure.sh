#!/bin/sh
# Configure host-local Multi-AI routing without editing the installed skill.
set -eu

usage() {
    printf '%s\n' 'Usage: sh configure.sh show | sh configure.sh engineer <default|codex|claude>' >&2
    exit 2
}

command=${1:-show}
case "$command" in
    show) [ "$#" -eq 1 ] || usage ;;
    engineer) [ "$#" -eq 2 ] || usage ;;
    *) usage ;;
esac

config_home=${MULTI_AI_CONFIG_HOME:-"$HOME/.multi-ai"}
config_path="$config_home/policy.yaml"

if [ "$command" = show ]; then
    if [ ! -f "$config_path" ]; then
        printf '%s\n' 'engineer: default'
        printf '%s\n' "Host policy: $config_path (not created)"
        exit 0
    fi
    family=$(awk '$1 == "engineer:" && ($2 == "default" || $2 == "codex" || $2 == "claude") { print $2 }' "$config_path")
    [ -n "$family" ] || { printf '%s\n' "Invalid host policy: $config_path" >&2; exit 1; }
    printf '%s\n' "engineer: $family"
    printf '%s\n' "Host policy: $config_path"
    exit 0
fi

family=$2
case "$family" in default|codex|claude) ;; *) usage ;; esac

if [ -e "$config_home" ] && [ ! -d "$config_home" ]; then
    printf '%s\n' "Not a configuration directory: $config_home" >&2
    exit 1
fi
if [ -e "$config_path" ] || [ -L "$config_path" ]; then
    if [ ! -f "$config_path" ] || [ -L "$config_path" ]; then
        printf '%s\n' "Refusing to replace a directory or link: $config_path" >&2
        exit 1
    fi
fi

mkdir -p -- "$config_home"
temporary_path="$config_home/.policy.yaml.$$.tmp"
trap 'rm -f -- "$temporary_path"' EXIT HUP INT TERM
{
    printf '%s\n' '# Host-local Multi-AI routing preference.'
    printf '%s\n' 'version: 1'
    printf '%s\n' 'role_families:'
    printf '%s\n' "  engineer: $family"
} > "$temporary_path"
mv -f -- "$temporary_path" "$config_path"
trap - EXIT HUP INT TERM

printf '%s\n' "engineer: $family"
printf '%s\n' "Host policy: $config_path"
printf '%s\n' 'Start a new Lead session, or ask the active Lead to re-read the host policy.'
