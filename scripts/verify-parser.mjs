// verify-parser.mjs — Unit-test the agent output parser WITHOUT launching Electron.
// Run: node scripts/verify-parser.mjs   (Node 22.6+ with type stripping, or Node 24)
import { parseAgentOutput, parseSessionIdFromOutput } from '../src/main/agentOutput.ts';

const mockState = { sessionIdCaptured: false };

// Test 1: Labeled Session ID (Ink TUI path, sessionIdSource: 'output')
const out1 = 'Welcome to opencode\nSession: 123e4567-e89b-12d3-a456-426614174000\nopencode>';
const res1 = parseAgentOutput(out1, 'opencode', mockState, 'output');
console.assert(res1.sessionId === '123e4567-e89b-12d3-a456-426614174000', 'Test 1 Failed: Labeled UUID');
console.log('Test 1:', res1.sessionId === '123e4567-e89b-12d3-a456-426614174000' ? 'PASS' : 'FAIL');

// Test 2: Generic UUID in early output
const out2 = 'Initializing...\n[debug] id=987fcdeb-51a2-43d1-b123-9876543210ab\nReady.';
const res2 = parseAgentOutput(out2, 'claude', mockState);
console.assert(res2.sessionId === '987fcdeb-51a2-43d1-b123-9876543210ab', 'Test 2 Failed: Generic UUID');
console.log('Test 2:', res2.sessionId === '987fcdeb-51a2-43d1-b123-9876543210ab' ? 'PASS' : 'FAIL');

// Test 3: Error Detection
const out3 = 'Loading...\nError: Permission denied accessing config.\nclaude>';
const res3 = parseAgentOutput(out3, 'claude', mockState);
console.assert(res3.actionRequired === true && res3.errors.length > 0, 'Test 3 Failed: Error Detection');
console.log('Test 3:', res3.actionRequired === true && res3.errors.length > 0 ? 'PASS' : 'FAIL');

// Test 4: File Change Detection
const out4 = 'Thinking...\nwrote src/main.ts\ncreated src/new.ts';
const res4 = parseAgentOutput(out4, 'opencode', mockState);
console.assert(res4.fileChanges.length === 2, 'Test 4 Failed: File Changes');
console.assert(res4.fileChanges[0].action === 'edit', 'Test 4a Failed');
console.assert(res4.fileChanges[1].action === 'create', 'Test 4b Failed');
console.log('Test 4:', res4.fileChanges.length === 2 && res4.fileChanges[0].action === 'edit' && res4.fileChanges[1].action === 'create' ? 'PASS' : 'FAIL');

// Test 5: Session ID extraction is one-shot (idempotent via sessionIdCaptured)
const res5 = parseAgentOutput(out1, 'opencode', { sessionIdCaptured: true });
console.assert(res5.sessionId === undefined, 'Test 5 Failed: sessionId should not re-extract when captured');
console.log('Test 5:', res5.sessionId === undefined ? 'PASS' : 'FAIL');

// Test 6: parseSessionIdFromOutput direct — labeled
console.assert(parseSessionIdFromOutput('session_id=abcdefab-1234-5678-9abc-def012345678') === 'abcdefab-1234-5678-9abc-def012345678', 'Test 6 Failed: direct labeled');
console.log('Test 6:', parseSessionIdFromOutput('session_id=abcdefab-1234-5678-9abc-def012345678') === 'abcdefab-1234-5678-9abc-def012345678' ? 'PASS' : 'FAIL');

// Test 7: no UUID → null
console.assert(parseSessionIdFromOutput('Hello, I am ready. What can I do?') === null, 'Test 7 Failed: no UUID should be null');
console.log('Test 7:', parseSessionIdFromOutput('Hello, I am ready. What can I do?') === null ? 'PASS' : 'FAIL');

// Test 8: opencode (sessionIdSource: 'db-pid') must NOT parse output for a session id —
// it does not print one; the DB path is the primary method.
const out8 = 'opencode\nSession: 223e4567-e89b-12d3-a456-426614174000\nopencode>';
const res8 = parseAgentOutput(out8, 'opencode', mockState, 'db-pid');
console.assert(res8.sessionId === undefined, 'Test 8 Failed: db-pid agent must not extract from output');
console.log('Test 8:', res8.sessionId === undefined ? 'PASS' : 'FAIL');

// Test 9: ANSI-escaped UUID in Ink TUI header must be extracted after strip
const out9 = '\x1b[36mSession:\x1b[0m 323e4567-e89b-12d3-a456-426614174000\x1b[0m';
const res9 = parseAgentOutput(out9, 'claude', mockState, 'output');
console.assert(res9.sessionId === '323e4567-e89b-12d3-a456-426614174000', 'Test 9 Failed: ANSI-wrapped UUID');
console.log('Test 9:', res9.sessionId === '323e4567-e89b-12d3-a456-426614174000' ? 'PASS' : 'FAIL');

console.log('✅ All parser verification tests passed.');
