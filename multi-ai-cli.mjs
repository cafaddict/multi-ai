#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

const VERSION = '0.1.0';
const FAMILIES = ['default', 'codex', 'claude'];
const configHome = path.resolve(process.env.MULTI_AI_CONFIG_HOME || path.join(os.homedir(), '.multi-ai'));
const configPath = path.join(configHome, 'policy.yaml');

function usage() {
  return `Usage:
  multi-ai-cli                         Show current routing and commands
  multi-ai-cli show                    Show current routing
  multi-ai-cli engineer <family>       Set default, codex, or claude
  multi-ai-cli tui                     Configure with an interactive terminal UI`;
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function readFamily() {
  if (!fs.existsSync(configPath)) return 'default';
  const stat = fs.lstatSync(configPath);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Invalid host policy: ${configPath}`);
  const match = fs.readFileSync(configPath, 'utf8').match(/^  engineer: (default|codex|claude)\s*$/m);
  if (!match) throw new Error(`Invalid host policy: ${configPath}`);
  return match[1];
}

function writeFamily(family) {
  if (!FAMILIES.includes(family)) throw new Error(`Unsupported Engineer family: ${family}`);
  if (fs.existsSync(configHome) && !fs.statSync(configHome).isDirectory()) {
    throw new Error(`Not a configuration directory: ${configHome}`);
  }
  if (fs.existsSync(configPath)) {
    const stat = fs.lstatSync(configPath);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error(`Refusing to replace a directory or link: ${configPath}`);
    }
  }
  fs.mkdirSync(configHome, { recursive: true });
  fs.writeFileSync(
    configPath,
    `# Host-local Multi-AI routing preference.\nversion: 1\nrole_families:\n  engineer: ${family}\n`,
    'utf8',
  );
}

function show(includeUsage = false) {
  console.log(`engineer: ${readFamily()}`);
  console.log(`Host policy: ${configPath}${fs.existsSync(configPath) ? '' : ' (not created)'}`);
  if (includeUsage) console.log(`\n${usage()}`);
}

async function tui() {
  if (!process.stdin.isTTY || !process.stdout.isTTY || !process.stdin.setRawMode) {
    throw new Error('TUI requires an interactive terminal. Use multi-ai-cli engineer <family> instead.');
  }

  const labels = {
    default: 'Default  (policy.yaml primary route)',
    codex: 'Codex    (configured Codex Engineer route)',
    claude: 'Claude   (configured Claude Engineer route)',
  };
  let selected = Math.max(0, FAMILIES.indexOf(readFamily()));
  let renderedLines = 0;

  const render = () => {
    if (renderedLines) {
      readline.moveCursor(process.stdout, 0, -renderedLines);
      readline.cursorTo(process.stdout, 0);
      readline.clearScreenDown(process.stdout);
    }
    const lines = [
      'Multi-AI Engineer routing',
      'Use ↑/↓ and Enter. Esc or q cancels.',
      '',
      ...FAMILIES.map((family, index) => `${index === selected ? '›' : ' '} ${labels[family]}`),
    ];
    process.stdout.write(`${lines.join('\n')}\n`);
    renderedLines = lines.length;
  };

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  const choice = await new Promise((resolve) => {
    const finish = (value) => {
      process.stdin.off('keypress', onKeypress);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      resolve(value);
    };
    const onKeypress = (_input, key = {}) => {
      if (key.name === 'up') selected = (selected + FAMILIES.length - 1) % FAMILIES.length;
      else if (key.name === 'down') selected = (selected + 1) % FAMILIES.length;
      else if (key.name === 'return') return finish(FAMILIES[selected]);
      else if (key.name === 'escape' || key.name === 'q') return finish(null);
      else if (key.ctrl && key.name === 'c') return finish(false);
      else return;
      render();
    };
    process.stdin.on('keypress', onKeypress);
    render();
  });

  if (choice === false) {
    process.exitCode = 130;
    return;
  }
  if (choice === null) {
    console.log('No changes made.');
    return;
  }
  writeFamily(choice);
  console.log(`Saved engineer: ${choice}`);
  console.log(`Host policy: ${configPath}`);
  console.log('Start a new Lead session, or ask the active Lead to re-read the host policy.');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) return show(true);
  if (args.length === 1 && args[0] === 'show') return show();
  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) return console.log(usage());
  if (args.length === 1 && (args[0] === '--version' || args[0] === '-v')) return console.log(VERSION);
  if (args.length === 1 && args[0] === 'tui') return tui();
  if (args.length === 2 && args[0] === 'engineer') {
    writeFamily(args[1]);
    return show();
  }
  throw new Error(usage());
}

main().catch((error) => fail(error.message));
