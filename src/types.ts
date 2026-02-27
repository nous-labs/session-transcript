/**
 * Generic message type — framework-agnostic.
 * Any AI assistant system can map its messages to this shape.
 */
export interface TranscriptMessage {
  role: "user" | "assistant" | "system"
  content: string
  agent?: string
  model?: string
  tools?: TranscriptToolCall[]
  timestamp?: number
}

export interface TranscriptToolCall {
  name: string
  status?: "running" | "completed" | "error"
  input?: string
  error?: string
}

export interface TranscriptTodo {
  content: string
  status: "pending" | "in_progress" | "completed" | "cancelled"
  priority?: string
}

export interface TranscriptOptions {
  /** Include tool call names (default: true) */
  tools?: boolean
  /** Include agent/model metadata (default: true) */
  metadata?: boolean
  /** Max characters per user message (default: 500) */
  maxUserChars?: number
  /** Max characters per assistant message (default: 1000) */
  maxAssistantChars?: number
}

export interface SessionState {
  messages: TranscriptMessage[]
  todos: TranscriptTodo[]
  sessionID: string
}

export type TailClassification = "clean-end" | "active-work" | "mid-tool"

export interface SmartTailResult {
  inject: boolean
  content: string
  estimatedTokens: number
  classification: TailClassification
  transcriptPath?: string
}

export interface SmartTailOptions {
  /** Directory where transcripts are stored (for pointer line) */
  transcriptDir?: string
  /** Max tokens for the tail (default: 1200) */
  maxTokens?: number
}

export interface PruneOptions {
  /** Max transcript files to keep (default: 20) */
  maxCount?: number
  /** Max age in days (default: 7) */
  maxAgeDays?: number
}
