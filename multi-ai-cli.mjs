#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { parse, stringify } from 'yaml';

const VERSION = '0.2.0';
const AGENTS = ['codex', 'claude'];
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];
const skillHome = path.dirname(fileURLToPath(import.meta.url));
const basePolicyPath = path.join(skillHome, 'policy.yaml');
const configHome = path.resolve(process.env.MULTI_AI_CONFIG_HOME || path.join(os.homedir(), '.multi-ai'));
const configPath = path.join(configHome, 'policy.yaml');

const routeGroups = [
  { label: 'Lead', path: 'lead', slots: ['primary', 'fallback'] },
  { label: 'Architect', path: 'roles.architect', slots: ['primary', 'fallback'] },
  { label: 'Engineer', path: 'roles.engineer', slots: ['primary', 'fallback'] },
  { label: 'Researcher', path: 'roles.researcher', slots: ['primary', 'fallback'] },
  {
    label: 'Reviewer for OpenAI maker',
    path: 'roles.reviewer.by_maker_family.openai',
    slots: ['primary', 'fallback', 'same_family_fallback'],
  },
  {
    label: 'Reviewer for Anthropic maker',
    path: 'roles.reviewer.by_maker_family.anthropic',
    slots: ['primary', 'fallback', 'same_family_fallback'],
  },
  {
    label: 'Competition primary-family lane',
    path: 'competition.lanes.primary_family',
    slots: ['primary', 'fallback'],
  },
  {
    label: 'Competition alternate-family lane',
    path: 'competition.lanes.alternate_family',
    slots: ['primary', 'fallback'],
  },
];

const editablePaths = new Set(['revision_rounds']);
for (const group of routeGroups) {
  for (const slot of group.slots) {
    for (const field of ['agent', 'model', 'effort']) editablePaths.add(`${group.path}.${slot}.${field}`);
  }
}

function usage() {
  return `Usage:
  multi-ai-cli                         Show effective policy and commands
  multi-ai-cli show                    Show the effective policy
  multi-ai-cli get <path>              Read one effective value
  multi-ai-cli set <path> <value>      Override one routing value
  multi-ai-cli unset <path>            Restore one value to the installed default
  multi-ai-cli reset                   Restore all installed defaults
  multi-ai-cli engineer <family>       Prefer default, codex, or claude Engineer routes
  multi-ai-cli tui                     Configure the full policy interactively

Examples:
  multi-ai-cli set lead.primary.effort xhigh
  multi-ai-cli set roles.engineer.primary.model claude-opus-5
  multi-ai-cli get roles.reviewer.by_maker_family.anthropic.primary.model`;
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function readYamlFile(filePath, label) {
  try {
    const value = parse(fs.readFileSync(filePath, 'utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('expected a mapping');
    return value;
  } catch (error) {
    throw new Error(`Invalid ${label} at ${filePath}: ${error.message}`);
  }
}

function readBasePolicy() {
  if (!fs.existsSync(basePolicyPath)) throw new Error(`Installed policy not found: ${basePolicyPath}`);
  return readYamlFile(basePolicyPath, 'installed policy');
}

function getPath(object, dottedPath) {
  return dottedPath.split('.').reduce((value, key) => value?.[key], object);
}

function setPath(object, dottedPath, value) {
  const keys = dottedPath.split('.');
  let cursor = object;
  for (const key of keys.slice(0, -1)) {
    if (!cursor[key] || typeof cursor[key] !== 'object') cursor[key] = {};
    cursor = cursor[key];
  }
  cursor[keys.at(-1)] = value;
}

function clone(value) {
  return structuredClone(value);
}

function validatePath(dottedPath) {
  if (!editablePaths.has(dottedPath)) {
    throw new Error(`Unsupported policy path: ${dottedPath}\nRun multi-ai-cli tui or --help to inspect editable settings.`);
  }
}

function coerceValue(dottedPath, rawValue) {
  validatePath(dottedPath);
  if (dottedPath === 'revision_rounds') {
    if (!/^\d+$/.test(rawValue)) throw new Error('revision_rounds must be an integer from 1 to 10.');
    const value = Number(rawValue);
    if (value < 1 || value > 10) throw new Error('revision_rounds must be an integer from 1 to 10.');
    return value;
  }
  if (dottedPath.endsWith('.agent')) {
    if (!AGENTS.includes(rawValue)) throw new Error(`agent must be one of: ${AGENTS.join(', ')}.`);
    return rawValue;
  }
  if (dottedPath.endsWith('.effort')) {
    if (!EFFORTS.includes(rawValue)) throw new Error(`effort must be one of: ${EFFORTS.join(', ')}.`);
    return rawValue;
  }
  if (!rawValue || /\s/.test(rawValue)) throw new Error('model must be a non-empty identifier without whitespace.');
  return rawValue;
}

function legacyEngineerOverrides(base, family) {
  if (family === 'default') return {};
  if (!AGENTS.includes(family)) throw new Error(`Unsupported legacy Engineer family: ${family}`);
  const routes = [base.roles?.engineer?.primary, base.roles?.engineer?.fallback].filter(Boolean);
  const preferred = routes.find((route) => route.agent === family);
  const alternate = routes.find((route) => route.agent !== family);
  if (!preferred || !alternate) throw new Error(`Installed policy has no complete Engineer routes for ${family}.`);
  const overrides = {};
  for (const field of ['agent', 'model', 'effort']) {
    overrides[`roles.engineer.primary.${field}`] = preferred[field];
    overrides[`roles.engineer.fallback.${field}`] = alternate[field];
  }
  return overrides;
}

function readOverrides(base) {
  if (!fs.existsSync(configPath)) return { overrides: {}, legacy: false };
  const stat = fs.lstatSync(configPath);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Invalid host policy: ${configPath}`);
  const host = readYamlFile(configPath, 'host policy');
  if (host.version === 1 && host.role_families && Object.keys(host.role_families).length === 1) {
    return { overrides: legacyEngineerOverrides(base, host.role_families.engineer), legacy: true };
  }
  if (host.version !== 2 || !host.overrides || typeof host.overrides !== 'object' || Array.isArray(host.overrides)) {
    throw new Error('Host policy must contain version: 2 and an overrides mapping.');
  }
  const overrides = {};
  for (const [dottedPath, rawValue] of Object.entries(host.overrides)) {
    validatePath(dottedPath);
    const value = coerceValue(dottedPath, String(rawValue));
    if (getPath(base, dottedPath) === undefined) throw new Error(`Installed policy does not contain: ${dottedPath}`);
    overrides[dottedPath] = value;
  }
  return { overrides, legacy: false };
}

function effectivePolicy(base, overrides) {
  const effective = clone(base);
  for (const [dottedPath, value] of Object.entries(overrides)) setPath(effective, dottedPath, value);
  return effective;
}

function sparseOverrides(base, effective) {
  const result = {};
  for (const dottedPath of [...editablePaths].sort()) {
    const baseValue = getPath(base, dottedPath);
    const effectiveValue = getPath(effective, dottedPath);
    if (effectiveValue !== baseValue) result[dottedPath] = effectiveValue;
  }
  return result;
}

function writeOverrides(overrides) {
  if (fs.existsSync(configHome) && !fs.statSync(configHome).isDirectory()) {
    throw new Error(`Not a configuration directory: ${configHome}`);
  }
  if (fs.existsSync(configPath)) {
    const stat = fs.lstatSync(configPath);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Refusing to replace a directory or link: ${configPath}`);
  }
  fs.mkdirSync(configHome, { recursive: true });
  const document = {
    version: 2,
    overrides: Object.fromEntries(Object.entries(overrides).sort(([a], [b]) => a.localeCompare(b))),
  };
  fs.writeFileSync(configPath, `# Host-local differences from the installed Multi-AI policy.\n${stringify(document)}`, 'utf8');
}

function load() {
  const base = readBasePolicy();
  const host = readOverrides(base);
  return { base, effective: effectivePolicy(base, host.overrides), ...host };
}

function show(includeUsage = false) {
  const { effective, overrides, legacy } = load();
  console.log(`# Effective Multi-AI policy${legacy ? ' (legacy host preference applied)' : ''}`);
  console.log(`# Installed: ${basePolicyPath}`);
  console.log(`# Host overrides: ${configPath}${fs.existsSync(configPath) ? ` (${Object.keys(overrides).length})` : ' (none)'}`);
  process.stdout.write(stringify(effective));
  if (includeUsage) console.log(`\n${usage()}`);
}

function setOverride(dottedPath, rawValue) {
  const { base, effective } = load();
  setPath(effective, dottedPath, coerceValue(dottedPath, rawValue));
  writeOverrides(sparseOverrides(base, effective));
  console.log(`${dottedPath}: ${getPath(effective, dottedPath)}`);
  console.log(`Host policy: ${configPath}`);
}

function unsetOverride(dottedPath) {
  validatePath(dottedPath);
  const { base, effective } = load();
  setPath(effective, dottedPath, getPath(base, dottedPath));
  writeOverrides(sparseOverrides(base, effective));
  console.log(`${dottedPath}: ${getPath(base, dottedPath)} (installed default)`);
  console.log(`Host policy: ${configPath}`);
}

function setEngineerFamily(family) {
  if (!['default', ...AGENTS].includes(family)) throw new Error('Engineer family must be default, codex, or claude.');
  const { base, effective } = load();
  const paths = ['primary', 'fallback'].flatMap((slot) =>
    ['agent', 'model', 'effort'].map((field) => `roles.engineer.${slot}.${field}`),
  );
  if (family === 'default') {
    for (const dottedPath of paths) setPath(effective, dottedPath, getPath(base, dottedPath));
  } else {
    for (const [dottedPath, value] of Object.entries(legacyEngineerOverrides(base, family))) {
      setPath(effective, dottedPath, value);
    }
  }
  writeOverrides(sparseOverrides(base, effective));
  console.log(`Engineer primary: ${effective.roles.engineer.primary.agent} / ${effective.roles.engineer.primary.model} / ${effective.roles.engineer.primary.effort}`);
  console.log(`Engineer fallback: ${effective.roles.engineer.fallback.agent} / ${effective.roles.engineer.fallback.model} / ${effective.roles.engineer.fallback.effort}`);
  console.log(`Host policy: ${configPath}`);
}

function select(title, options, selected = 0) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || !process.stdin.setRawMode) {
    throw new Error('TUI requires an interactive terminal. Use multi-ai-cli set <path> <value> instead.');
  }
  let index = Math.max(0, Math.min(selected, options.length - 1));
  let renderedLines = 0;
  const render = () => {
    if (renderedLines) {
      readline.moveCursor(process.stdout, 0, -renderedLines);
      readline.cursorTo(process.stdout, 0);
      readline.clearScreenDown(process.stdout);
    }
    const lines = [title, 'Use ↑/↓ and Enter. Esc or q goes back.', '', ...options.map((option, i) => `${i === index ? '›' : ' '} ${option}`)];
    process.stdout.write(`${lines.join('\n')}\n`);
    renderedLines = lines.length;
  };
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve) => {
    const finish = (value) => {
      process.stdin.off('keypress', onKeypress);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      resolve(value);
    };
    const onKeypress = (_input, key = {}) => {
      if (key.name === 'up') index = (index + options.length - 1) % options.length;
      else if (key.name === 'down') index = (index + 1) % options.length;
      else if (key.name === 'return') return finish(index);
      else if (key.name === 'escape' || key.name === 'q') return finish(null);
      else if (key.ctrl && key.name === 'c') return finish(false);
      else return;
      render();
    };
    process.stdin.on('keypress', onKeypress);
    render();
  });
}

async function ask(question, initial) {
  const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => terminal.question(`${question} [${initial}]: `, resolve));
  terminal.close();
  return answer.trim() || String(initial);
}

function routeLabel(route) {
  return `${route.agent} / ${route.model} / ${route.effort}`;
}

async function editRoute(effective, routePath) {
  const current = getPath(effective, routePath);
  const agentIndex = await select(`Agent for ${routePath}\nCurrent: ${routeLabel(current)}`, AGENTS, AGENTS.indexOf(current.agent));
  if (agentIndex === false) return false;
  if (agentIndex === null) return true;
  const agent = AGENTS[agentIndex];
  const model = await ask('Model identifier', current.model);
  const effortIndex = await select(`Effort for ${routePath}\nAgent/model: ${agent} / ${model}`, EFFORTS, EFFORTS.indexOf(current.effort));
  if (effortIndex === false) return false;
  if (effortIndex === null) return true;
  setPath(effective, routePath, {
    agent: coerceValue(`${routePath}.agent`, agent),
    model: coerceValue(`${routePath}.model`, model),
    effort: coerceValue(`${routePath}.effort`, EFFORTS[effortIndex]),
  });
  return true;
}

async function editGroup(effective, group) {
  while (true) {
    const options = group.slots.map((slot) => `${slot}: ${routeLabel(getPath(effective, `${group.path}.${slot}`))}`);
    options.push('Back');
    const choice = await select(group.label, options);
    if (choice === false) return false;
    if (choice === null || choice === group.slots.length) return true;
    const keepGoing = await editRoute(effective, `${group.path}.${group.slots[choice]}`);
    if (!keepGoing) return false;
  }
}

async function tui() {
  const { base, effective, legacy } = load();
  if (legacy) console.log('The legacy Engineer preference will be migrated when you save.');
  while (true) {
    const changed = Object.keys(sparseOverrides(base, effective)).length;
    const options = [
      ...routeGroups.map((group) => group.label),
      `Revision rounds: ${effective.revision_rounds}`,
      'Restore installed defaults',
      `Save and exit${changed ? ` (${changed} overrides)` : ''}`,
      'Discard and exit',
    ];
    const choice = await select('Multi-AI policy', options);
    if (choice === false) {
      process.exitCode = 130;
      return;
    }
    if (choice === null || choice === options.length - 1) {
      console.log('No changes saved.');
      return;
    }
    if (choice < routeGroups.length) {
      const keepGoing = await editGroup(effective, routeGroups[choice]);
      if (!keepGoing) {
        process.exitCode = 130;
        return;
      }
      continue;
    }
    if (choice === routeGroups.length) {
      const value = await ask('Revision rounds (1-10)', effective.revision_rounds);
      effective.revision_rounds = coerceValue('revision_rounds', value);
      continue;
    }
    if (choice === routeGroups.length + 1) {
      const restored = clone(base);
      for (const key of Object.keys(effective)) delete effective[key];
      Object.assign(effective, restored);
      continue;
    }
    if (choice === routeGroups.length + 2) {
      const overrides = sparseOverrides(base, effective);
      writeOverrides(overrides);
      console.log(`Saved ${Object.keys(overrides).length} override(s).`);
      console.log(`Host policy: ${configPath}`);
      console.log('Start a new Lead session, or ask the active Lead to re-read the host policy.');
      return;
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) return show(true);
  if (args.length === 1 && args[0] === 'show') return show();
  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) return console.log(usage());
  if (args.length === 1 && (args[0] === '--version' || args[0] === '-v')) return console.log(VERSION);
  if (args.length === 1 && args[0] === 'tui') return tui();
  if (args.length === 1 && args[0] === 'reset') {
    writeOverrides({});
    console.log(`Restored installed defaults.\nHost policy: ${configPath}`);
    return;
  }
  if (args.length === 2 && args[0] === 'get') {
    validatePath(args[1]);
    console.log(getPath(load().effective, args[1]));
    return;
  }
  if (args.length === 2 && args[0] === 'unset') return unsetOverride(args[1]);
  if (args.length === 2 && args[0] === 'engineer') return setEngineerFamily(args[1]);
  if (args.length === 3 && args[0] === 'set') return setOverride(args[1], args[2]);
  throw new Error(usage());
}

main().catch((error) => fail(error.message));
