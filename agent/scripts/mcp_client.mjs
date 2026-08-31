// Minimal MCP stdio client — connects to a local `npx`-style MCP server,
// initializes, lists tools, and optionally calls one tool.
// Usage: node mcp_client.mjs --cmd "npx -y shadcn@latest mcp" [--tool name] [--args '{"..."}']
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
function get(flag) { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null }
const cmd = get('--cmd')
const tool = get('--tool')
const argfile = get('--argfile')
const toolArgs = argfile ? JSON.parse(readFileSync(argfile, 'utf-8')) : (get('--args') ? JSON.parse(get('--args')) : {})

const [bin, ...rest] = cmd.split(/\s+/)
const child = spawn(bin, rest, { stdio: ['pipe', 'pipe', 'pipe'], shell: true, env: process.env })

let buf = ''
let pending = new Map()
let nextId = 1
let initialized = false
const out = []

function send(method, params, isNotification = false) {
  const id = isNotification ? undefined : nextId++
  const msg = { jsonrpc: '2.0', method, ...(isNotification ? {} : { id }), ...(params ? { params } : {}) }
  child.stdin.write(JSON.stringify(msg) + '\n')
  if (!isNotification) return id
}

child.stdout.on('data', (d) => {
  buf += d.toString()
  let nl
  while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl).trim()
    buf = buf.slice(nl + 1)
    if (!line) continue
    let msg
    try { msg = JSON.parse(line) } catch { continue }
    if (msg.id && pending.has(msg.id)) {
      const { resolve } = pending.get(msg.id)
      pending.delete(msg.id)
      resolve(msg)
    } else if (msg.method === 'notification' || msg.method === 'window/logMessage' || msg.method === 'log') {
      // ignore
    }
  }
})
child.stderr.on('data', (d) => { /* server logs, ignore */ })

function rpc(method, params) {
  return new Promise((resolve) => {
    const id = send(method, params)
    pending.set(id, { resolve })
  })
}

async function main() {
  // MCP initialize
  const init = await rpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'deskflow-mcp-client', version: '1.0.0' },
  })
  out.push('INIT: ' + JSON.stringify(init.result?.serverInfo || init.result || init))
  send('notifications/initialized', {}, true)

  if (!tool) {
    const tools = await rpc('tools/list', {})
    const list = (tools.result?.tools || []).map(t => ({ name: t.name, desc: (t.description||'').slice(0,80) }))
    out.push('TOOLS(' + list.length + '): ' + JSON.stringify(list, null, 2))
  } else {
    const res = await rpc('tools/call', { name: tool, arguments: toolArgs })
    out.push('CALL ' + tool + ': ' + JSON.stringify(res.result?.content || res.result || res, null, 2))
  }
  console.log(out.join('\n'))
  child.kill()
  process.exit(0)
}

child.on('error', (e) => { console.error('SPAWN ERR', e.message); process.exit(1) })
setTimeout(() => { console.error('TIMEOUT'); console.log(out.join('\n')); process.exit(1) }, 120000)
main()
