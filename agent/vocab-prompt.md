# Vocabulary Update Prompt

> Copy everything below the line into your AI chat.

---

Update the vocabulary map using these IPC calls via window.deskflowAPI.vocab:

Adding synonyms: window.deskflowAPI.vocab.add({ canonical: "workspace", variant: "terminal" })
Correcting wrong terms: window.deskflowAPI.vocab.correct({ wrong: "ws", correct: "workspace" })
Listing all mappings: window.deskflowAPI.vocab.list()
Removing a mapping: window.deskflowAPI.vocab.delete(id)

Example session:

User: add vocab workspace = terminal, ws, terminal workspace
AI: calls vocab.add({ canonical: "workspace", variant: "terminal" }) + vocab.add({ canonical: "workspace", variant: "ws" }) + vocab.add({ canonical: "workspace", variant: "terminal workspace" })

User: when I say conductor I mean the swarm system
AI: calls vocab.add({ canonical: "conductor", variant: "swarm" })

User: I meant workspace not terminal
AI: calls vocab.correct({ wrong: "terminal", correct: "workspace" })

User: show my vocabulary
AI: calls vocab.list() and displays the results

User: remove the ws mapping
AI: calls vocab.delete(id_of_ws_mapping)

These words all mean the same thing and should be mapped to one canonical term. The vocabulary resolver stores variant→canonical mappings so the AI agent knows they're synonyms. Both user_dictionary (what terms mean) and vocabulary_map (what terms are aliases) get injected into every agent prompt via assemble-context.
