# Life River Rules

## Voice Input

Every text input or textarea in `/life` that asks the user for meaning must use `VoiceInputWrapper`.

This includes:

- Phase title
- Phase story
- Feelings note
- Lessons learned
- Impact notes
- Reflection editor
- Memory notes
- Any future Covenant or Gold note field

Speech-to-text is not optional decoration. It is a core input method for the Life River.

## Drafts

Draft phases must always be visible in River mode.

If no drafts exist, show an empty state. Never hide the drafts section.

## Covenant / Gold / Memories

Covenant, Gold, and Memories must be visible in River mode without requiring the user to leave River mode.

Each phase card must show compact Covenant, Gold, and Memories data even when the default Phases lens is active.

Adding Covenant, Gold, or Memories must open an inline overlay, not navigate away from River mode.

## Editing

Every phase ring and every phase card must expose edit access.

Clicking a ring should open the phase edit dialog.

Every phase card must show an edit button.