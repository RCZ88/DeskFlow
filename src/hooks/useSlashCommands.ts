import { useCallback } from "react"
import type { ChatMsg } from "./useAiChat"
import { findCommand, fillPrompt, getAllCommands, type CustomSlashCommand } from "../services/customSlashCommands"
import { generateUUID } from "../lib/uuid"

export interface SlashCommandResult {
  handled: boolean
  messages?: ChatMsg[]
  shouldSendToAI?: boolean
  promptToSend?: string
}

export interface SlashCommandContext {
  connectors: any[]
  currentThreadDate: string
}

export function useSlashCommands() {
  const parseAndExecute = useCallback(async (
    text: string,
    ctx: SlashCommandContext
  ): Promise<SlashCommandResult> => {
    const trimmed = text.trim()
    if (!trimmed.startsWith("/")) return { handled: false }

    const [command, ...args] = trimmed.slice(1).split(" ")
    const argStr = args.join(" ").trim()

    // Check built-in commands first
    switch (command.toLowerCase()) {
      case "unread":
        return await handleUnread(ctx)
      case "inbox":
        return await handleInbox(ctx, argStr)
      case "calendar":
        return await handleCalendar(ctx, argStr)
      case "today":
        return await handleToday(ctx)
      case "sync":
        return await handleSync(ctx, argStr)
      case "email":
        return await handleEmailSearch(ctx, argStr)
      case "plan":
        return { handled: true, shouldSendToAI: true }
      case "digest":
        return { handled: true, shouldSendToAI: true }
      case "reflect":
        return { handled: true, shouldSendToAI: true }
      case "focus":
        return { handled: true, shouldSendToAI: true }
      default:
        // Check custom commands
        const custom = findCommand(command.toLowerCase())
        if (custom) {
          const prompt = fillPrompt(custom.prompt, argStr)
          return { handled: true, shouldSendToAI: true, promptToSend: prompt }
        }
        return {
          handled: true,
          messages: [makeAssistantMsg(`Unknown command: /${command}. Type / to see available commands.`)],
        }
    }
  }, [])

  return { parseAndExecute }
}

async function handleUnread(ctx: SlashCommandContext): Promise<SlashCommandResult> {
  const emailConnectors = ctx.connectors.filter((c: any) => c.type === "email")
  if (emailConnectors.length === 0) {
    return { handled: true, messages: [makeAssistantMsg("No email connectors configured. Add one in Settings.")] }
  }

  const lines: string[] = ["**Unread Emails**"]
  let totalUnread = 0

  for (const conn of emailConnectors) {
    try {
      const r = await window.deskflowAPI?.connectors?.items(conn.id, { unreadOnly: true, limit: 10 })
      if (r?.success && r.items?.length > 0) {
        totalUnread += r.items.length
        lines.push(`\n**${conn.displayName}** \u2014 ${r.items.length} unread:`)
        for (const item of r.items) {
          const from = item.metadata?.from ? ` (${item.metadata.from})` : ""
          const date = item.date ? new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""
          lines.push(`\u2022 ${item.subject || "(no subject)"}${from} \u2014 ${date}`)
        }
      }
    } catch (e) {
      lines.push(`\n**${conn.displayName}**: Failed to fetch \u2014 ${(e as Error).message}`)
    }
  }

  if (totalUnread === 0) {
    lines.push("\nNo unread emails. You're all caught up!")
  }

  return { handled: true, messages: [makeAssistantMsg(lines.join("\n"))] }
}

async function handleInbox(ctx: SlashCommandContext, arg: string): Promise<SlashCommandResult> {
  const limit = parseInt(arg) || 10
  const emailConnectors = ctx.connectors.filter((c: any) => c.type === "email")
  if (emailConnectors.length === 0) {
    return { handled: true, messages: [makeAssistantMsg("No email connectors configured.")] }
  }

  const lines: string[] = [`**Recent Emails** (last ${limit})`]

  for (const conn of emailConnectors) {
    try {
      const r = await window.deskflowAPI?.connectors?.items(conn.id, { limit, type: "email" })
      if (r?.success && r.items?.length > 0) {
        lines.push(`\n**${conn.displayName}:**`)
        for (const item of r.items) {
          const marker = item.is_read ? " " : "\u25cf"
          const from = item.metadata?.from ? ` \u2014 ${item.metadata.from}` : ""
          lines.push(`${marker} ${item.subject || "(no subject)"}${from}`)
        }
      }
    } catch (e) {
      lines.push(`\n**${conn.displayName}**: Error \u2014 ${(e as Error).message}`)
    }
  }

  return { handled: true, messages: [makeAssistantMsg(lines.join("\n"))] }
}

async function handleCalendar(ctx: SlashCommandContext, arg: string): Promise<SlashCommandResult> {
  const limit = parseInt(arg) || 5
  const calConnectors = ctx.connectors.filter((c: any) => c.type === "calendar")
  if (calConnectors.length === 0) {
    return { handled: true, messages: [makeAssistantMsg("No calendar connectors configured. Add one in Settings.")] }
  }

  const lines: string[] = [`**Upcoming Events** (next ${limit})`]

  for (const conn of calConnectors) {
    try {
      const r = await window.deskflowAPI?.connectors?.items(conn.id, { limit, type: "event" })
      if (r?.success && r.items?.length > 0) {
        lines.push(`\n**${conn.displayName}:**`)
        for (const item of r.items) {
          const start = item.metadata?.startTime ? formatEventTime(item.metadata.startTime) : ""
          const end = item.metadata?.endTime ? `\u2013 ${formatEventTime(item.metadata.endTime)}` : ""
          lines.push(`\u2022 ${item.summary || "(no title)"} ${start} ${end}`)
        }
      }
    } catch (e) {
      lines.push(`\n**${conn.displayName}**: Error \u2014 ${(e as Error).message}`)
    }
  }

  return { handled: true, messages: [makeAssistantMsg(lines.join("\n"))] }
}

async function handleToday(ctx: SlashCommandContext): Promise<SlashCommandResult> {
  const lines: string[] = ["**Today at a Glance**"]
  const now = new Date()

  const emailConnectors = ctx.connectors.filter((c: any) => c.type === "email")
  let emailCount = 0
  for (const conn of emailConnectors) {
    try {
      const r = await window.deskflowAPI?.connectors?.items(conn.id, { unreadOnly: true, limit: 5 })
      if (r?.success) emailCount += r.items?.length || 0
    } catch {}
  }
  lines.push(`\n**Emails**: ${emailCount} unread`)

  const calConnectors = ctx.connectors.filter((c: any) => c.type === "calendar")
  let eventCount = 0
  for (const conn of calConnectors) {
    try {
      const r = await window.deskflowAPI?.connectors?.items(conn.id, { limit: 10, type: "event" })
      if (r?.success) {
        const todayEvents = (r.items || []).filter((item: any) => {
          const d = new Date(item.date)
          return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        })
        eventCount += todayEvents.length
        if (todayEvents.length > 0) {
          lines.push(`\n**${conn.displayName}** \u2014 ${todayEvents.length} events:`)
          for (const item of todayEvents) {
            const start = item.metadata?.startTime ? formatEventTime(item.metadata.startTime) : ""
            lines.push(`\u2022 ${item.summary || "(no title)"} ${start}`)
          }
        }
      }
    } catch {}
  }
  if (eventCount === 0) lines.push("**Calendar**: No events today")

  return { handled: true, messages: [makeAssistantMsg(lines.join("\n"))] }
}

async function handleSync(ctx: SlashCommandContext, arg: string): Promise<SlashCommandResult> {
  const lines: string[] = ["**Sync Results**"]
  const targets = arg
    ? ctx.connectors.filter((c: any) => c.displayName.toLowerCase().includes(arg.toLowerCase()))
    : ctx.connectors

  if (targets.length === 0) {
    return { handled: true, messages: [makeAssistantMsg(`No connector matching "${arg}" found.`)] }
  }

  for (const conn of targets) {
    try {
      const r = await window.deskflowAPI?.connectors?.sync(conn.id)
      if (r?.success) {
        lines.push(`**${conn.displayName}**: ${r.itemsAdded} items added`)
      } else {
        lines.push(`**${conn.displayName}**: ${r.error || "Sync failed"}`)
      }
    } catch (e) {
      lines.push(`**${conn.displayName}**: ${(e as Error).message}`)
    }
  }

  return { handled: true, messages: [makeAssistantMsg(lines.join("\n"))] }
}

async function handleEmailSearch(ctx: SlashCommandContext, arg: string): Promise<SlashCommandResult> {
  if (!arg) {
    return { handled: true, messages: [makeAssistantMsg("Usage: /email [search query] \u2014 searches email subjects and content.")] }
  }
  const emailConnectors = ctx.connectors.filter((c: any) => c.type === "email")
  const lines: string[] = [`**Email Search**: "${arg}"`]

  for (const conn of emailConnectors) {
    try {
      const r = await window.deskflowAPI?.connectors?.items(conn.id, { search: arg, limit: 10 })
      if (r?.success && r.items?.length > 0) {
        lines.push(`\n**${conn.displayName}** \u2014 ${r.items.length} results:`)
        for (const item of r.items) {
          const from = item.metadata?.from ? ` (${item.metadata.from})` : ""
          lines.push(`\u2022 ${item.subject || "(no subject)"}${from}`)
        }
      } else {
        lines.push(`\n**${conn.displayName}**: No matches`)
      }
    } catch (e) {
      lines.push(`\n**${conn.displayName}**: Error \u2014 ${(e as Error).message}`)
    }
  }

  return { handled: true, messages: [makeAssistantMsg(lines.join("\n"))] }
}

function makeAssistantMsg(content: string): ChatMsg {
  return {
    id: generateUUID(),
    role: "assistant",
    content,
    timestamp: Date.now(),
  }
}

function formatEventTime(isoStr: string): string {
  try {
    const d = new Date(isoStr)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } catch {
    return isoStr
  }
}
