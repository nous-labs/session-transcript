import { describe, expect, it } from "bun:test"
import { formatTranscript } from "../src/transcript-writer"
import type { TranscriptMessage } from "../src/types"

describe("formatTranscript", () => {
  describe("#given basic messages", () => {
    const messages: TranscriptMessage[] = [
      {
        role: "user",
        content: "Fix the auth bug in login.ts",
        timestamp: 1709000000000,
      },
      {
        role: "assistant",
        content: "I found the issue — the JWT token validation was missing the audience check.",
        agent: "sisyphus",
        model: "claude-opus-4-6",
        tools: [
          { name: "Read", status: "completed" },
          { name: "Edit", status: "completed" },
        ],
        timestamp: 1709000060000,
      },
    ]

    it("#then formats a readable transcript", () => {
      const result = formatTranscript("ses_abc123", messages)
      expect(result).toContain("# Session Transcript")
      expect(result).toContain("ses_abc123")
      expect(result).toContain("**Messages:** 2")
      expect(result).toContain("Fix the auth bug")
      expect(result).toContain("JWT token validation")
      expect(result).toContain("Tools: Read, Edit")
    })

    it("#then includes agent metadata", () => {
      const result = formatTranscript("ses_abc123", messages)
      expect(result).toContain("sisyphus")
      expect(result).toContain("claude-opus-4-6")
    })
  })

  describe("#given metadata disabled", () => {
    it("#then omits agent/model info", () => {
      const messages: TranscriptMessage[] = [
        {
          role: "assistant",
          content: "Done.",
          agent: "sisyphus",
          model: "claude-opus-4-6",
        },
      ]
      const result = formatTranscript("ses_test", messages, { metadata: false })
      expect(result).not.toContain("sisyphus")
      expect(result).not.toContain("claude-opus-4-6")
    })
  })

  describe("#given tools disabled", () => {
    it("#then omits tool calls", () => {
      const messages: TranscriptMessage[] = [
        {
          role: "assistant",
          content: "Edited the file.",
          tools: [{ name: "Edit", status: "completed" }],
        },
      ]
      const result = formatTranscript("ses_test", messages, { tools: false })
      expect(result).not.toContain("Tools:")
    })
  })

  describe("#given long content", () => {
    it("#then truncates user messages to maxUserChars", () => {
      const longContent = "x".repeat(1000)
      const messages: TranscriptMessage[] = [
        { role: "user", content: longContent },
      ]
      const result = formatTranscript("ses_test", messages, {
        maxUserChars: 100,
      })
      expect(result.length).toBeLessThan(longContent.length)
      expect(result).toContain("...")
    })
  })

  describe("#given system messages", () => {
    it("#then skips them", () => {
      const messages: TranscriptMessage[] = [
        { role: "system", content: "You are an AI assistant." },
        { role: "user", content: "Hello" },
      ]
      const result = formatTranscript("ses_test", messages)
      expect(result).not.toContain("You are an AI assistant")
      expect(result).toContain("Hello")
    })
  })

  describe("#given empty messages", () => {
    it("#then produces header only", () => {
      const result = formatTranscript("ses_test", [])
      expect(result).toContain("# Session Transcript")
      expect(result).toContain("**Messages:** 0")
    })
  })

  describe("#given tool with error status", () => {
    it("#then marks the tool as errored", () => {
      const messages: TranscriptMessage[] = [
        {
          role: "assistant",
          content: "Trying to edit.",
          tools: [{ name: "Edit", status: "error" }],
        },
      ]
      const result = formatTranscript("ses_test", messages)
      expect(result).toContain("Edit (error)")
    })
  })
})
