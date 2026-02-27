import { describe, expect, it } from "bun:test"
import { generateSmartTail } from "../src/smart-tail"
import type { SessionState } from "../src/types"

describe("generateSmartTail", () => {
  describe("#given clean end (no active todos)", () => {
    const state: SessionState = {
      sessionID: "ses_clean",
      messages: [
        { role: "user", content: "Fix the bug" },
        { role: "assistant", content: "Done, bug fixed." },
      ],
      todos: [
        { content: "Fix the bug", status: "completed" },
      ],
    }

    it("#then classifies as clean-end", () => {
      const result = generateSmartTail(state)
      expect(result.classification).toBe("clean-end")
    })

    it("#then does not inject", () => {
      const result = generateSmartTail(state)
      expect(result.inject).toBe(false)
      expect(result.content).toBe("")
      expect(result.estimatedTokens).toBe(0)
    })
  })

  describe("#given active work (pending todos)", () => {
    const state: SessionState = {
      sessionID: "ses_active",
      messages: [
        { role: "user", content: "Implement auth, then add tests" },
        { role: "assistant", content: "Auth implemented. Moving to tests next." },
      ],
      todos: [
        { content: "Implement auth", status: "completed" },
        { content: "Add tests", status: "pending", priority: "high" },
      ],
    }

    it("#then classifies as active-work", () => {
      const result = generateSmartTail(state)
      expect(result.classification).toBe("active-work")
    })

    it("#then injects classification header with directive", () => {
      const result = generateSmartTail(state)
      expect(result.inject).toBe(true)
      expect(result.content).toContain("COMPACTION INTERRUPTED ACTIVE WORK")
      expect(result.content).toContain("Action required:")
      expect(result.content).toContain("Resume from where you left off")
    })

    it("#then injects last user + assistant + todos", () => {
      const result = generateSmartTail(state)
      expect(result.content).toContain("Implement auth, then add tests")
      expect(result.content).toContain("Auth implemented")
      expect(result.content).toContain("Your prepared response (present this):")
      expect(result.content).toContain("Add tests")
      expect(result.content).toContain("pending")
    })

    it("#then stays within token budget", () => {
      const result = generateSmartTail(state, { maxTokens: 1200 })
      expect(result.estimatedTokens).toBeLessThanOrEqual(1200)
    })
  })

  describe("#given mid-tool (running tool calls)", () => {
    const state: SessionState = {
      sessionID: "ses_midtool",
      messages: [
        { role: "user", content: "Refactor the database layer" },
        {
          role: "assistant",
          content: "Refactoring in progress.",
          tools: [
            { name: "Read", status: "completed" },
            { name: "Edit", status: "running" },
          ],
        },
      ],
      todos: [
        { content: "Refactor database", status: "in_progress" },
      ],
    }

    it("#then classifies as mid-tool", () => {
      const result = generateSmartTail(state)
      expect(result.classification).toBe("mid-tool")
    })

    it("#then includes classification header and tools in flight", () => {
      const result = generateSmartTail(state)
      expect(result.inject).toBe(true)
      expect(result.content).toContain("COMPACTION INTERRUPTED MID-EXECUTION")
      expect(result.content).toContain("Review what was in flight")
      expect(result.content).toContain("Tools in flight")
      expect(result.content).toContain("Edit")
    })
  })

  describe("#given transcript path option", () => {
    it("#then includes pointer to full transcript", () => {
      const state: SessionState = {
        sessionID: "ses_ptr",
        messages: [
          { role: "user", content: "Hello" },
        ],
        todos: [
          { content: "Do something", status: "pending" },
        ],
      }
      const result = generateSmartTail(state, {
        transcriptDir: "brain/transcripts",
      })
      expect(result.content).toContain("brain/transcripts/ses_ptr.md")
      expect(result.transcriptPath).toBe("brain/transcripts/ses_ptr.md")
    })
  })

  describe("#given no transcript dir", () => {
    it("#then omits pointer line", () => {
      const state: SessionState = {
        sessionID: "ses_nodir",
        messages: [{ role: "user", content: "Hello" }],
        todos: [{ content: "Work", status: "pending" }],
      }
      const result = generateSmartTail(state)
      expect(result.content).not.toContain("Full transcript:")
      expect(result.transcriptPath).toBeUndefined()
    })
  })

  describe("#given all todos cancelled", () => {
    it("#then classifies as clean-end", () => {
      const state: SessionState = {
        sessionID: "ses_cancelled",
        messages: [{ role: "user", content: "Never mind" }],
        todos: [
          { content: "Task A", status: "cancelled" },
          { content: "Task B", status: "completed" },
        ],
      }
      const result = generateSmartTail(state)
      expect(result.classification).toBe("clean-end")
      expect(result.inject).toBe(false)
    })
  })
})
