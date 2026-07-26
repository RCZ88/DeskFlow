#!/usr/bin/env node
/**
 * agent-coordination/run-exclusive.mjs
 * ---------------------------------------------------------------------------
 * Run ANY command while holding a named lock, with a live heartbeat so the
 * lock never goes stale mid-run and never leaks if the process dies.
 *
 *   node run-exclusive.mjs <lockName> [--needs <otherLock>...] [--forbid <lock>...] -- <command...>
 *
 * Examples:
 *   # Build: forbid running while the app owns the DB, take the build lock.
 *   node run-exclusive.mjs build --forbid app -- npm run build
 *
 *   # Start app: single instance + must not overlap a build.
 *   node run-exclusive.mjs app --forbid build app -- npm start
 *
 *   # Run a migration alone (no app, no other migration).
 *   node run-exclusive.mjs migrate --forbid app migrate -- node scripts/migrate.mjs
 * ---------------------------------------------------------------------------
 */
import { spawn } from 'node:child_process'
import { acquireLock, releaseLock, heartbeat, getState, done } from './coord.mjs'

function parse(argv) {
  const dashDash = argv.indexOf('--')
  const head = dashDash === -1 ? argv : argv.slice(0, dashDash)
  const cmd = dashDash === -1 ? [] : argv.slice(dashDash + 1)
  const opts = { lock: head[0], needs: [], forbid: [] }
  for (let i = 1; i < head.length; i++) {
    const key = head[i].replace(/^--/, '')
    if (key === 'needs' || key === 'forbid') {
      while (i + 1 < head.length && !head[i + 1].startsWith('--')) opts[key].push(head[++i])
    }
  }
  return { opts, cmd }
}

const { opts, cmd } = parse(process.argv.slice(2))
if (!opts.lock || cmd.length === 0) {
  console.error('usage: run-exclusive.mjs <lockName> [--forbid <l>...] [--needs <l>...] -- <command...>')
  process.exit(2)
}

const AGENT = process.env.AGENT_ID || `${opts.lock}-${process.pid}`
const TASK = process.env.AGENT_TASK || cmd.join(' ')

// 1) Precondition checks against currently-held locks.
const st = getState()
for (const f of opts.forbid) {
  if (f === opts.lock) continue // handled by the exclusive acquire below
  if (st.locks[f]) {
    console.error(`REFUSED: cannot run "${cmd.join(' ')}" — lock "${f}" is held by ${st.locks[f].agent}.`)
    console.error(`Another agent is doing something incompatible. Wait for it to finish (see: node coord.mjs status).`)
    process.exit(3)
  }
}
for (const n of opts.needs) {
  if (!st.locks[n]) {
    console.error(`REFUSED: required lock "${n}" is not currently held.`)
    process.exit(3)
  }
}

// 2) Acquire our exclusive lock.
const got = acquireLock(AGENT, opts.lock, undefined, TASK)
if (!got.ok) {
  console.error(`REFUSED: lock "${opts.lock}" is already held by ${got.heldBy}.`)
  console.error(`This is exactly the collision we are preventing (duplicate ${opts.lock}). Wait and retry.`)
  process.exit(3)
}
console.error(`[coord] ${AGENT} acquired "${opts.lock}" — running: ${cmd.join(' ')}`)

// 3) Heartbeat so the lock stays alive for long builds/runs.
const hb = setInterval(() => { try { heartbeat(AGENT, TASK) } catch {} }, 30_000)

let released = false
function cleanup() {
  if (released) return
  released = true
  clearInterval(hb)
  try { releaseLock(AGENT, opts.lock) } catch {}
  try { done(AGENT) } catch {}
  console.error(`[coord] ${AGENT} released "${opts.lock}"`)
}

const child = spawn(cmd[0], cmd.slice(1), { stdio: 'inherit', shell: process.platform === 'win32' })
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => { child.kill(sig); cleanup(); process.exit(1) })
}
child.on('exit', (code, signal) => {
  cleanup()
  process.exit(signal ? 1 : (code ?? 0))
})
process.on('exit', cleanup)
