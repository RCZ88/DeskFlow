# 🚀 Workspace Initialization Guide

> **Generated for:** opencode
> **Date:** 2026-06-05T12:48:40.065Z

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
- `problems.json` and `requests.json` — Each item has a `steps` array (inline sub-tasks with status tracking)

## Step 4: Skills Setup

Browse the `skills/` directory and load relevant skills for your tasks.

## Step 5: Begin Work

Once initialization is complete, you can begin working on:
1. Review and update `PROBLEMS.md` with any discovered issues
2. Address high-priority items
3. Update `state.md` as you make changes
4. For each problem or request you work on, add steps to the `steps` array — add step-by-step items so the human can track progress:
   - Each step: `{ "id": "problem-1-step-1", "description": "what to do", "status": "pending|in_progress|completed" }`
   - Use `[add-step]` and `[complete-step]` actions to manage them

---
*This file is managed by Tracker Mind. It is read by AI agents during workspace initialization.*
