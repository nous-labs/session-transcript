import type {
  SessionState,
  SmartTailOptions,
  SmartTailResult,
  TailClassification,
  TranscriptMessage,
  TranscriptTodo,
} from "./types"

const DEFAULT_MAX_TOKENS = 1200
const CHARS_PER_TOKEN = 4

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * CHARS_PER_TOKEN
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars - 3) + "..."
}

function classifyState(state: SessionState): TailClassification {
  const activeTodos = state.todos.filter(
    (t) => t.status === "pending" || t.status === "in_progress",
  )

  if (activeTodos.length === 0) return "clean-end"

  const lastMsg = findLastAssistant(state.messages)
  if (lastMsg?.tools?.some((t) => t.status === "running")) return "mid-tool"

  return "active-work"
}

function findLastUser(messages: TranscriptMessage[]): TranscriptMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]!.role === "user") return messages[i]
  }
  return undefined
}

function findLastAssistant(messages: TranscriptMessage[]): TranscriptMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]!.role === "assistant") return messages[i]
  }
  return undefined
}

function formatTodos(todos: TranscriptTodo[]): string {
  return todos
    .map((t) => `- [${t.status}${t.priority ? ` ${t.priority}` : ""}] ${t.content}`)
    .join("\n")
}

/**
 * Classification-aware headers that instruct the post-compaction agent.
 * The agent reads text — if the text says what to do, it will do it.
 */
const CLASSIFICATION_HEADERS: Record<Exclude<TailClassification, "clean-end">, { title: string; instruction: string }> = {
  "active-work": {
    title: "COMPACTION INTERRUPTED ACTIVE WORK",
    instruction: "You were mid-task when compaction hit. Resume from where you left off. If you had findings ready, present them to the user NOW.",
  },
  "mid-tool": {
    title: "COMPACTION INTERRUPTED MID-EXECUTION",
    instruction: "You were in the middle of executing tools when compaction hit. Review what was in flight and resume or re-run as needed.",
  },
}

/**
 * Classify session state and generate smart tail for post-compaction injection.
 *
 * Rule-based classification (zero LLM calls):
 * - clean-end: No active todos → inject nothing
 * - active-work: Active todos → inject directive + last user+assistant + todo list (~800 tokens)
 * - mid-tool: Tool calls in flight → inject directive + above + tool context (~1200 tokens)
 */
export function generateSmartTail(
  state: SessionState,
  options?: SmartTailOptions,
): SmartTailResult {
  const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS
  const classification = classifyState(state)

  if (classification === "clean-end") {
    return {
      inject: false,
      content: "",
      estimatedTokens: 0,
      classification,
      transcriptPath: buildTranscriptPath(state.sessionID, options),
    }
  }

  const header = CLASSIFICATION_HEADERS[classification]
  const lines: string[] = []
  lines.push(`### ${header.title}`)
  lines.push(`**Action required:** ${header.instruction}`)
  lines.push(``)

  const lastUser = findLastUser(state.messages)
  if (lastUser) {
    const condensed = lastUser.content.trim().slice(0, 800)
    lines.push(`**Last user request:** ${condensed}`)
    lines.push(``)
  }

  const lastAssistant = findLastAssistant(state.messages)
  if (lastAssistant) {
    const condensed = lastAssistant.content.trim().slice(0, 1600)
    lines.push(`**Your prepared response (present this):** ${condensed}`)
    lines.push(``)
  }

  const activeTodos = state.todos.filter(
    (t) => t.status === "pending" || t.status === "in_progress",
  )
  if (activeTodos.length > 0) {
    lines.push(`**Active todos:**`)
    lines.push(formatTodos(activeTodos))
    lines.push(``)
  }

  if (classification === "mid-tool" && lastAssistant?.tools) {
    const runningTools = lastAssistant.tools.filter((t) => t.status === "running")
    if (runningTools.length > 0) {
      lines.push(`**Tools in flight:** ${runningTools.map((t) => t.name).join(", ")}`)
      lines.push(``)
    }
  }

  const transcriptPath = buildTranscriptPath(state.sessionID, options)
  if (transcriptPath) {
    lines.push(`**Full transcript:** ${transcriptPath}`)
    lines.push(``)
  }

  const content = truncateToTokens(lines.join("\n"), maxTokens)

  return {
    inject: true,
    content,
    estimatedTokens: estimateTokens(content),
    classification,
    transcriptPath,
  }
}

function buildTranscriptPath(
  sessionID: string,
  options?: SmartTailOptions,
): string | undefined {
  if (!options?.transcriptDir) return undefined
  return `${options.transcriptDir}/${sessionID}.md`
}
