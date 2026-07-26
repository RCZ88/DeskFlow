# Feature Logic Gap Detection Checklist

> Run this checklist AFTER implementing EVERY feature.
> If any critical item is unchecked, the feature is NOT done.

---

## Flow Completeness
- [ ] Every user action has a clear next step
- [ ] No dead ends (user gets stuck with no way forward)
- [ ] All error states have recovery paths
- [ ] All loading states have completion or timeout
- [ ] All success states have visible feedback
- [ ] All cancel/undo paths work

## Data Flow
- [ ] Every IPC call has a handler in main.ts
- [ ] Every handler has a preload bridge
- [ ] Every database write has a corresponding read
- [ ] Every file write has a corresponding read
- [ ] Every state change triggers UI update
- [ ] Every async operation has error handling

## File Operations
- [ ] File naming convention documented
- [ ] File storage location defined
- [ ] File cleanup/rotation policy defined
- [ ] File tagging/indexing system exists
- [ ] File download/export works correctly
- [ ] File import handles edge cases

## UI/UX
- [ ] Empty states handled
- [ ] Loading states handled
- [ ] Error states handled
- [ ] Success feedback shown
- [ ] Undo/cancel available where appropriate
- [ ] Responsive design works
- [ ] Keyboard navigation works

## Integration
- [ ] Feature works with all agent types
- [ ] Feature works in offline mode (if applicable)
- [ ] Feature respects token budgets
- [ ] Feature doesn't break existing functionality
- [ ] Feature has backward compatibility

## Security
- [ ] User input sanitized
- [ ] API keys not exposed in logs
- [ ] File paths validated
- [ ] SQL injection prevented
- [ ] XSS prevention in place

## Documentation
- [ ] Mermaid flowchart created
- [ ] Gaps documented in REGISTRY.md
- [ ] Critical gaps fixed before completion
- [ ] Non-critical gaps noted for future

---

## How to Use

1. After implementing a feature, open this checklist
2. Go through each item
3. Check off items that pass
4. Unchecked items = gaps to fix
5. Update REGISTRY.md with gaps found
6. Fix critical gaps (anything blocking user flow)
7. Note non-critical gaps for future sprints

## Severity Levels

- **CRITICAL** — Blocks user flow, must fix before claiming done
- **HIGH** — Significant UX issue, should fix soon
- **MEDIUM** — Minor issue, can defer
- **LOW** — Nice to have, lowest priority
