#!/usr/bin/env node
// AI CLI — Bridge for AI agents to interact with DeskFlow from the terminal
// Usage: node agent/ai-cli.js <command> [args...]
//
// Commands:
//   create-problem <title> --priority <p> --category <c> --description <d>
//   update-problem <id> --status <s>
//   complete-checklist <id>
//   update-request <id> --status <s>
//   log-activity --summary <s> --type <entity_type> --entity <id> --action <a>
//   task-done [--result <summary>]

const fs = require('fs');
const path = require('path');

const ACTIONS_FILE = path.join(__dirname, 'actions.json');

function readActions() {
  try {
    const raw = fs.readFileSync(ACTIONS_FILE, 'utf-8').trim();
    return JSON.parse(raw || '{"actions":[]}');
  } catch {
    return { terminal_id: '', actions: [] };
  }
}

function writeActions(data) {
  fs.writeFileSync(ACTIONS_FILE, JSON.stringify(data, null, 2));
}

function parseArgs() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const parsed = { _: [] };
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].replace(/^--/, '');
      i++;
      parsed[key] = args[i];
    } else {
      parsed._.push(args[i]);
    }
  }
  return { cmd, parsed };
}

function main() {
  const { cmd, parsed } = parseArgs();
  if (!cmd) {
    console.error('Usage: node agent/ai-cli.js <command> [args...]');
    console.error('Commands: create-problem, update-problem, complete-checklist, update-request, log-activity, task-done');
    process.exit(1);
  }

  const data = readActions();
  let action = null;

  switch (cmd) {
    case 'create-problem': {
      const title = parsed._[0] || parsed.title;
      if (!title) { console.error('Error: title required'); process.exit(1); }
      action = { type: 'create_problem', title, priority: parsed.priority || 'medium', category: parsed.category || 'other', description: parsed.description || '' };
      break;
    }
    case 'update-problem': {
      const id = parsed._[0] || parsed.id;
      if (!id) { console.error('Error: problem id required'); process.exit(1); }
      if (!parsed.status) { console.error('Error: --status required'); process.exit(1); }
      action = { type: 'update_problem', id, status: parsed.status };
      break;
    }
    case 'complete-checklist': {
      const id = parsed._[0] || parsed.id;
      if (!id) { console.error('Error: checklist id required'); process.exit(1); }
      action = { type: 'complete_checklist', id };
      break;
    }
    case 'update-request': {
      const id = parsed._[0] || parsed.id;
      if (!id) { console.error('Error: request id required'); process.exit(1); }
      if (!parsed.status) { console.error('Error: --status required'); process.exit(1); }
      action = { type: 'update_request', id, status: parsed.status };
      break;
    }
    case 'task-done': {
      action = { type: 'task_done', result: parsed.result || '' };
      break;
    }
    default:
      console.error('Unknown command:', cmd);
      console.error('Valid: create-problem, update-problem, complete-checklist, update-request, log-activity, task-done');
      process.exit(1);
  }

  data.actions.push(action);
  writeActions(data);
  console.log(`[AI-CLI] Queued action: ${action.type}${action.title ? ': ' + action.title : ''}`);
}

main();
