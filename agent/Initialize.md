# 🚀 Workspace Initialization Guide

> **Generated for:** opencode
> **Date:** 2026-05-27T19:25:17.498Z

## Overview

This file guides the AI agent through workspace initialization. Follow these steps in order.

## Step 1: Read AGENTS.md

Read `AGENTS.md` to understand the workspace structure and available files.

## Step 2: Agent Session Setup

Run: `opencode --init` in the project root to initialize.

## Step 3: Review Project State

- `state.md` — Current project state and recent changes
- `PROBLEMS.md` — Known issues to fix
- `REQUESTS.md` — User feature requests
- `problems.json` — Machine-parseable problem data
- `requests.json` — Machine-parseable request data
- `checklists.json` — Human checklists (steps with human approval tracking)

## Step 4: Skills Setup

Browse the `skills/` directory and load relevant skills for your tasks.

## Step 5: Begin Work

Once initialization is complete, you can begin working on:
1. Review and update `PROBLEMS.md` with any discovered issues
2. Address high-priority items
3. Update `state.md` as you make changes
4. For each problem or request you work on, create a checklist in `checklists.json` — add step-by-step items so the human can track and approve progress:
   - Each item: `{ "parentType": "problem|request", "parentId": "...", "description": "what to do", "requiresHuman": true, "status": "pending|in_progress|completed" }`
   - Update `status` as you progress
   - When a step is complete, the human will set `humanApproved: true` via the UI

---
*This file is managed by Tracker Mind. It is read by AI agents during workspace initialization.*
