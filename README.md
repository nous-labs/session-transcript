# @nous-labs/session-transcript

Session transcript persistence for AI coding assistants. Markdown-formatted conversation logging with smart tail for context injection after compaction.

## Installation

Clone the repository:

```bash
git clone https://github.com/nous-labs/session-transcript.git
```

Add as a local dependency in your project's `package.json`. Note: the local directory may be named `nous-session-transcript` but the cloned repo will be `session-transcript`.

```json
{
  "dependencies": {
    "@nous-labs/session-transcript": "file:../session-transcript"
  }
}
```

## Features

- Zero runtime dependencies
- Markdown-formatted transcript output
- Smart tail generation for context injection after compaction
- Automatic transcript pruning by count or age
- Full TypeScript types

## API

### `formatTranscript(state, options?)`

Formats session messages into a markdown transcript.

```typescript
import { formatTranscript } from '@nous-labs/session-transcript';

const markdown = formatTranscript(sessionState, {
  tools: true,           // include tool call summaries
  metadata: true,        // include session metadata header
  maxUserChars: 10000,   // truncate user messages
  maxAssistantChars: 20000  // truncate assistant messages
});
```

### `generateSmartTail(state, options?)`

Generates a context-aware tail snippet for injection after compaction. Classifies the session state as:

- `clean-end`: session finished naturally, no work in progress
- `active-work`: user has given instructions, waiting for assistant to act
- `mid-tool`: a tool call is in progress and needs completion

```typescript
import { generateSmartTail } from '@nous-labs/session-transcript';

const result = generateSmartTail(sessionState, {
  transcriptDir: './transcripts',
  maxTokens: 2000
});

// result.inject: boolean - whether to inject the tail
// result.content: string - the tail content
// result.estimatedTokens: number
// result.classification: 'clean-end' | 'active-work' | 'mid-tool'
// result.transcriptPath?: string - path to full transcript
```

### `writeTranscript(dir, sessionID, content)`

Persists transcript to disk.

```typescript
import { writeTranscript } from '@nous-labs/session-transcript';

await writeTranscript('./transcripts', 'session-123', markdownContent);
```

### `pruneTranscripts(dir, options?)`

Removes old transcripts based on count or age.

```typescript
import { pruneTranscripts } from '@nous-labs/session-transcript';

await pruneTranscripts('./transcripts', {
  maxCount: 100,     // keep only 100 most recent
  maxAgeDays: 30     // delete transcripts older than 30 days
});
```

## Types

```typescript
interface TranscriptMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  agent?: string;
  model?: string;
  tools?: TranscriptToolCall[];
  timestamp?: number;
}

interface TranscriptToolCall {
  name: string;
  status?: 'running' | 'completed' | 'error';
  input?: string;
  error?: string;
}

interface TranscriptTodo {
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: string;
}

interface TranscriptOptions {
  tools?: boolean;
  metadata?: boolean;
  maxUserChars?: number;
  maxAssistantChars?: number;
}

interface SessionState {
  messages: TranscriptMessage[];
  todos: TranscriptTodo[];
  sessionID: string;
}

interface SmartTailResult {
  inject: boolean;
  content: string;
  estimatedTokens: number;
  classification: TailClassification;
  transcriptPath?: string;
}

interface SmartTailOptions {
  transcriptDir?: string;
  maxTokens?: number;
}

interface PruneOptions {
  maxCount?: number;
  maxAgeDays?: number;
}

type TailClassification = 'clean-end' | 'active-work' | 'mid-tool';
```

## Usage Example

```typescript
import { formatTranscript, generateSmartTail, writeTranscript } from '@nous-labs/session-transcript';

// Format full transcript
const transcript = formatTranscript(sessionState, {
  tools: true,
  metadata: true
});

// Save to disk
await writeTranscript('./transcripts', sessionState.id, transcript);

// Generate smart tail for context injection after compaction
const tail = generateSmartTail(sessionState, {
  maxTokens: 1500
});

if (tail.inject) {
  // Inject tail.content into the next context window
  console.log(`Injecting ${tail.estimatedTokens} tokens (${tail.classification})`);
}
```

## Scripts

```bash
bun test           # run tests
bun run build      # compile TypeScript
bun run typecheck  # type checking only
```

## License

MIT

## Repository

https://github.com/nous-labs/session-transcript
