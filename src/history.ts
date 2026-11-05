/** Bound history by both entries and text size; always retain the latest undo. */
export const HISTORY_LIMIT = 50;
export const HISTORY_CHARACTERS = 2_000_000;

export function trimHistory(entries: string[]): string[] {
  let size = 0;
  let start = entries.length;
  while (start > 0 && entries.length - start < HISTORY_LIMIT) {
    const length = entries[start - 1].length;
    if (start < entries.length && size + length > HISTORY_CHARACTERS) break;
    size += length;
    start--;
  }
  return entries.slice(start);
}

export function pushHistory(entries: string[], text: string): string[] {
  return trimHistory([...entries, text]);
}

/** Group adjacent keystrokes, but start a new undo step after any other action. */
export class ManualHistory {
  private previous?: { id: string; at: number };

  reset() {
    this.previous = undefined;
  }

  record(id: string, versions: string[], previousText: string, now = Date.now()) {
    const grouped = this.previous?.id === id && now - this.previous.at < 800;
    this.previous = { id, at: now };
    return grouped ? versions : pushHistory(versions, previousText);
  }
}
