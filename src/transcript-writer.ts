import type { TranscriptMessage, TranscriptOptions, TranscriptToolCall } from "./types"

const DEFAULT_OPTIONS: Required<TranscriptOptions> = {
  tools: true,
  metadata: true,
  maxUserChars: 500,
  maxAssistantChars: 1000,
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max - 3) + "..."
}

function formatToolCalls(tools: TranscriptToolCall[]): string {
  if (tools.length === 0) return ""
  const names = tools.map((t) => {
    if (t.status === "error") return `${t.name} (error)`
    return t.name
  })
  return `\n> Tools: ${names.join(", ")}`
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

/**
 * Format messages into a condensed markdown transcript.
 *
 * Designed for post-compaction continuity — captures conversational flow
 * without the full tool outputs that bloat context.
 */
export function formatTranscript(
  sessionID: string,
  messages: TranscriptMessage[],
  options?: TranscriptOptions,
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const lines: string[] = []

  lines.push(`# Session Transcript`)
  lines.push(``)
  lines.push(`**Session:** ${sessionID}`)
  lines.push(`**Messages:** ${messages.length}`)
  if (messages.length > 0) {
    const first = messages[0]
    const last = messages[messages.length - 1]
    if (first?.timestamp && last?.timestamp) {
      lines.push(`**Time:** ${formatTimestamp(first.timestamp)} → ${formatTimestamp(last.timestamp)}`)
    }
  }
  lines.push(``)
  lines.push(`---`)
  lines.push(``)

  for (const msg of messages) {
    if (msg.role === "system") continue

    const time = msg.timestamp ? `[${formatTimestamp(msg.timestamp)}] ` : ""

    if (msg.role === "user") {
      lines.push(`### ${time}User`)
      lines.push(``)
      lines.push(truncate(msg.content.trim(), opts.maxUserChars))
    }

    if (msg.role === "assistant") {
      const meta =
        opts.metadata && msg.agent
          ? ` (${msg.agent}${msg.model ? ` · ${msg.model}` : ""})`
          : ""
      lines.push(`### ${time}Assistant${meta}`)
      lines.push(``)
      lines.push(truncate(msg.content.trim(), opts.maxAssistantChars))

      if (opts.tools && msg.tools && msg.tools.length > 0) {
        lines.push(formatToolCalls(msg.tools))
      }
    }

    lines.push(``)
  }

  return lines.join("\n")
}
