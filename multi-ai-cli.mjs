#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { parse, stringify } from 'yaml';

const VERSION = '0.3.1';
const AGENTS = ['codex', 'claude'];
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];
const BACK = Symbol('back');
class Separator {
  constructor(separator = '──────────────') {
    this.separator = separator;
  }
}
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

async function choose(message, choices, defaultValue) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || !process.stdin.setRawMode) {
    throw new Error('TUI requires an interactive terminal. Use multi-ai-cli set <path> <value> instead.');
  }
  const selectable = choices
    .map((choice, index) => (choice instanceof Separator ? null : index))
    .filter((index) => index !== null);
  let active = choices.findIndex((choice) => !(choice instanceof Separator) && choice.value === defaultValue);
  if (active < 0) active = selectable[0];
  let renderedLines = 0;
  const color = (code, value) => process.env.NO_COLOR !== undefined ? value : `\u001b[${code}m${value}\u001b[0m`;
  const fit = (value) => {
    const width = Math.max(30, (process.stdout.columns || 80) - 4);
    return value.length > width ? `${value.slice(0, width - 1)}…` : value;
  };
  const clear = () => {
    if (!renderedLines) return;
    readline.moveCursor(process.stdout, 0, -renderedLines);
    readline.cursorTo(process.stdout, 0);
    readline.clearScreenDown(process.stdout);
    renderedLines = 0;
  };
  const render = () => {
    clear();
    const lines = [
      `${color('36', '?')} ${color('1', message)} ${color('2', '(↑/↓ move · Enter select · Esc/q back)')}`,
      ...choices.map((choice, index) => {
        if (choice instanceof Separator) return color('2', `  ${choice.separator}`);
        const cursor = index === active ? color('36', '❯') : ' ';
        const name = index === active ? color('1;36', fit(choice.name)) : fit(choice.name);
        return `${cursor} ${name}`;
      }),
      '',
      color('2', fit(choices[active]?.description || ' ')),
    ];
    process.stdout.write(`${lines.join('\n')}\n`);
    renderedLines = lines.length;
  };

  process.stdin.resume();
  readline.emitKeypressEvents(process.stdin);
  const wasRaw = process.stdin.isRaw;
  process.stdin.setRawMode(true);
  process.stdout.write('\u001b[?25l');

  return new Promise((resolve, reject) => {
    const finish = (value, error) => {
      process.stdin.off('keypress', onKeypress);
      process.stdin.setRawMode(Boolean(wasRaw));
      process.stdin.pause();
      clear();
      process.stdout.write('\u001b[?25h');
      if (error) reject(error);
      else resolve(value);
    };
    const move = (offset) => {
      const position = selectable.indexOf(active);
      const next = Math.max(0, Math.min(selectable.length - 1, position + offset));
      active = selectable[next];
      render();
    };
    const onKeypress = (_input, key = {}) => {
      if (key.name === 'up') move(-1);
      else if (key.name === 'down') move(1);
      else if (key.name === 'return' || key.name === 'enter') finish(choices[active].value);
      else if (key.name === 'escape' || (key.name === 'q' && !key.ctrl && !key.meta)) finish(BACK);
      else if (key.ctrl && key.name === 'c') {
        const error = new Error('User canceled the prompt.');
        error.name = 'ExitPromptError';
        finish(undefined, error);
      }
    };
    process.stdin.on('keypress', onKeypress);
    render();
  });
}

function screen(title, detail) {
  console.clear();
  console.log('╭─────────────────────────────────────────────────────────────╮');
  console.log(`  Multi-AI Policy  ·  ${title}`);
  if (detail) console.log(`  ${detail}`);
  console.log('╰─────────────────────────────────────────────────────────────╯\n');
}

function routeLabel(route) {
  return `${route.agent} / ${route.model} / ${route.effort}`;
}

function modelChoices(base, effective, agent) {
  const models = new Map();
  for (const policy of [base, effective]) {
    for (const group of routeGroups) {
      for (const slot of group.slots) {
        const route = getPath(policy, `${group.path}.${slot}`);
        if (route?.agent !== agent || !route.model) continue;
        if (!models.has(route.model)) models.set(route.model, new Set());
        models.get(route.model).add(`${group.label} · ${slot.replaceAll('_', ' ')}`);
      }
    }
  }
  return [...models.entries()].map(([model, uses]) => ({
    name: model,
    value: model,
    description: `Configured for ${[...uses].slice(0, 3).join(', ')}`,
  }));
}

async function editRoute(base, effective, routePath) {
  const current = getPath(effective, routePath);
  const draft = { ...current };
  let step = 0;
  while (true) {
    screen('Edit route', `${routePath} · step ${step + 1} of 4`);
    if (step === 0) {
      const agent = await choose(
        'Agent / provider family',
        AGENTS.map((value) => ({
          name: value === 'codex' ? 'Codex' : 'Claude Code',
          value,
          description: `Provider family: ${base.families[value]}`,
        })),
        draft.agent,
      );
      if (agent === BACK) return;
      draft.agent = agent;
      const available = modelChoices(base, effective, draft.agent);
      if (!available.some(({ value }) => value === draft.model)) draft.model = available[0]?.value;
      if (!draft.model) throw new Error(`No configured models are available for ${draft.agent}.`);
      step = 1;
      continue;
    }
    if (step === 1) {
      const available = modelChoices(base, effective, draft.agent);
      const model = await choose('Model', available, draft.model);
      if (model === BACK) {
        step = 0;
        continue;
      }
      draft.model = model;
      step = 2;
      continue;
    }
    if (step === 2) {
      const effort = await choose(
        'Reasoning effort',
        EFFORTS.map((value) => ({ name: value, value })),
        draft.effort,
      );
      if (effort === BACK) {
        step = 1;
        continue;
      }
      draft.effort = effort;
      step = 3;
      continue;
    }
    const action = await choose(
      'Apply this route?',
      [
        { name: `Apply  ${routeLabel(draft)}`, value: 'apply', description: 'Stage this route in the TUI.' },
        { name: 'Cancel', value: 'cancel', description: 'Keep the current route.' },
      ],
      'apply',
    );
    if (action === BACK) {
      step = 2;
      continue;
    }
    if (action === 'cancel') return;
    setPath(effective, routePath, {
      agent: coerceValue(`${routePath}.agent`, draft.agent),
      model: coerceValue(`${routePath}.model`, draft.model),
      effort: coerceValue(`${routePath}.effort`, draft.effort),
    });
    return;
  }
}

async function editGroup(base, effective, group) {
  while (true) {
    screen(group.label, 'Choose a route to edit');
    const choice = await choose(
      group.label,
      [
        ...group.slots.map((slot) => ({
          name: slot.replaceAll('_', ' '),
          value: slot,
          description: routeLabel(getPath(effective, `${group.path}.${slot}`)),
        })),
        new Separator(),
        { name: '← Back', value: 'back' },
      ],
    );
    if (choice === BACK || choice === 'back') return;
    await editRoute(base, effective, `${group.path}.${choice}`);
  }
}

async function tui() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('TUI requires an interactive terminal. Use multi-ai-cli set <path> <value> instead.');
  }
  const { base, effective, legacy } = load();
  try {
    while (true) {
      const changed = Object.keys(sparseOverrides(base, effective)).length;
      screen(
        'Host configuration',
        `${changed} override${changed === 1 ? '' : 's'} · ${configPath}${legacy ? ' · legacy setting loaded' : ''}`,
      );
      const choice = await choose(
        'What would you like to configure?',
        [
          new Separator('── Roles ──'),
          ...routeGroups.slice(0, 4).map((group, index) => ({
            name: group.label,
            value: `group:${index}`,
            description: `primary: ${routeLabel(getPath(effective, `${group.path}.primary`))}`,
          })),
          new Separator('── Review ──'),
          ...routeGroups.slice(4, 6).map((group, offset) => ({
            name: group.label,
            value: `group:${offset + 4}`,
            description: `primary: ${routeLabel(getPath(effective, `${group.path}.primary`))}`,
          })),
          new Separator('── Competition ──'),
          ...routeGroups.slice(6).map((group, offset) => ({
            name: group.label,
            value: `group:${offset + 6}`,
            description: `primary: ${routeLabel(getPath(effective, `${group.path}.primary`))}`,
          })),
          new Separator('── Policy ──'),
          {
            name: 'Revision rounds',
            value: 'revision',
            description: `Current limit: ${effective.revision_rounds}`,
          },
          { name: 'Restore installed defaults', value: 'restore', description: 'Clear every staged host override.' },
          new Separator(),
          {
            name: `✓ Save and exit${changed ? ` (${changed} overrides)` : ''}`,
            value: 'save',
            description: 'Write the host policy and exit.',
          },
          { name: '× Discard and exit', value: 'discard', description: 'Leave the host policy unchanged.' },
        ],
        'group:0',
      );

      if (choice === BACK) {
        console.clear();
        console.log('No changes saved.');
        return;
      }
      if (choice.startsWith('group:')) {
        await editGroup(base, effective, routeGroups[Number(choice.split(':')[1])]);
        continue;
      }
      if (choice === 'revision') {
        screen('Revision rounds', 'Maximum correction cycles before the Lead reports a blocker');
        const rounds = await choose(
          'Revision-round limit',
          Array.from({ length: 10 }, (_, index) => ({ name: String(index + 1), value: index + 1 })),
          effective.revision_rounds,
        );
        if (rounds !== BACK) effective.revision_rounds = rounds;
        continue;
      }
      if (choice === 'restore') {
        const confirmed = await choose(
          'Restore every installed default?',
          [
            { name: 'No, keep my staged settings', value: false },
            { name: 'Yes, clear all host overrides', value: true },
          ],
          false,
        );
        if (confirmed !== BACK && confirmed) {
          const restored = clone(base);
          for (const key of Object.keys(effective)) delete effective[key];
          Object.assign(effective, restored);
        }
        continue;
      }
      if (choice === 'discard') {
        console.clear();
        console.log('No changes saved.');
        return;
      }
      if (choice === 'save') {
        const overrides = sparseOverrides(base, effective);
        writeOverrides(overrides);
        console.clear();
        console.log(`✓ Saved ${Object.keys(overrides).length} override(s).`);
        console.log(`  ${configPath}`);
        console.log('\nStart a new Lead session after changing its route.');
        return;
      }
    }
  } catch (error) {
    if (error?.name === 'ExitPromptError') {
      console.clear();
      console.log('No changes saved.');
      process.exitCode = 130;
      return;
    }
    throw error;
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
