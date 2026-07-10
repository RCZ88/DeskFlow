// DeskFlow AI — revamped component library barrel.
// Import from "@/components/ai" (or the relative path in your project).

// Tokens & helpers
export * from "./tokens"
export * from "./types"
export { cn } from "./lib/cn"
export * from "./lib/motion"

// Foundation
export { GlassCard } from "./GlassCard"
export { SectionHead } from "./SectionHead"
export { StatusDot } from "./StatusDot"
export { IconButton } from "./IconButton"
export { MetricCard } from "./MetricCard"
export { StateShell, EmptyState } from "./StateShell"

// Primitives
export { Skeleton, SkeletonRow } from "./primitives/Skeleton"
export { CountUp } from "./primitives/CountUp"
export { CheckDraw } from "./primitives/CheckDraw"
export { Segmented } from "./primitives/Segmented"
export { Collapsible } from "./primitives/Collapsible"
export { Progress } from "./primitives/Progress"
export { Dialog } from "./primitives/Dialog"

// Sections
export { DailyDigestBoard } from "./digest/DailyDigestBoard"
export { FocusBoard } from "./focus/FocusBoard"
export { GoalRow } from "./focus/GoalRow"
export { PlanBoard } from "./plan/PlanBoard"
export { BulkImportDialog } from "./plan/BulkImportDialog"
export { ReflectFeed } from "./reflect/ReflectFeed"
export { SummaryGrid } from "./summary/SummaryGrid"
export { ConnectorsPanel } from "./connectors/ConnectorsPanel"

// Chat
export { ChatPanel } from "./chat/ChatPanel"
export { ChatInput } from "./chat/ChatInput"
export { MessageBubble } from "./chat/MessageBubble"
export { ThinkingIndicator } from "./chat/ThinkingIndicator"
export { TypewriterText } from "./chat/TypewriterText"
export { AgentProgressBar } from "./chat/AgentProgressBar"
export { CharCountRing } from "./chat/CharCountRing"
export { ChatEmptyState } from "./chat/ChatEmptyState"
