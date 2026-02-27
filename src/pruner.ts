import type { PruneOptions } from "./types"

const DEFAULT_MAX_COUNT = 20
const DEFAULT_MAX_AGE_DAYS = 7

/**
 * Write a transcript to disk.
 * Creates the directory if it doesn't exist.
 */
export async function writeTranscript(
  dir: string,
  sessionID: string,
  content: string,
): Promise<string> {
  const { mkdir } = await import("node:fs/promises")
  await mkdir(dir, { recursive: true })

  const path = `${dir}/${sessionID}.md`
  await Bun.write(path, content)
  return path
}

/**
 * Prune old transcript files.
 * Keeps the most recent files up to maxCount, and removes files older than maxAgeDays.
 */
export async function pruneTranscripts(
  dir: string,
  options?: PruneOptions,
): Promise<number> {
  const maxCount = options?.maxCount ?? DEFAULT_MAX_COUNT
  const maxAgeDays = options?.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS
  const { readdir, stat, unlink } = await import("node:fs/promises")

  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return 0
  }

  const mdFiles = entries.filter((f) => f.endsWith(".md"))
  if (mdFiles.length === 0) return 0

  const withStats = await Promise.all(
    mdFiles.map(async (f) => {
      const path = `${dir}/${f}`
      const s = await stat(path).catch(() => null)
      return { path, mtime: s?.mtimeMs ?? 0 }
    }),
  )

  withStats.sort((a, b) => b.mtime - a.mtime)

  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000
  let removed = 0

  for (let i = 0; i < withStats.length; i++) {
    const file = withStats[i]!
    const shouldRemove = i >= maxCount || file.mtime < cutoff

    if (shouldRemove) {
      await unlink(file.path).catch(() => {})
      removed++
    }
  }

  return removed
}
