/**
 * Typing simulation for mock AI responses.
 *
 * Streams text character-by-character via onDelta callbacks,
 * with natural pauses at punctuation to mimic LLM generation.
 */

const BASE_DELAY = 25; // ms per character
const PUNCT_DELAY = 80; // ms extra pause at punctuation
const NEWLINE_DELAY = 150; // ms extra pause at newlines

const PUNCT_CHARS = new Set([".", ",", "!", "?", ":", ";", "。", "，", "！", "？"]);

function charDelay(char: string): number {
  if (char === "\n") return BASE_DELAY + NEWLINE_DELAY;
  if (PUNCT_CHARS.has(char)) return BASE_DELAY + PUNCT_DELAY;
  // Add small random jitter (±10ms)
  return BASE_DELAY + Math.floor(Math.random() * 20) - 10;
}

/**
 * Simulate streaming by emitting characters one-by-one via onDelta.
 * Returns the full text after all characters have been emitted.
 */
export async function simulateStreaming(
  text: string,
  onDelta: (chunk: string) => void,
): Promise<string> {
  // Emit in small chunks (1-3 chars) for performance
  let i = 0;
  while (i < text.length) {
    // Determine chunk size: 1 char normally, up to 3 for regular chars
    let chunkSize = 1;
    if (!PUNCT_CHARS.has(text[i]) && text[i] !== "\n") {
      chunkSize = Math.min(2 + Math.floor(Math.random() * 2), text.length - i);
      // Don't chunk across punctuation or newlines
      for (let j = 1; j < chunkSize; j++) {
        if (PUNCT_CHARS.has(text[i + j]) || text[i + j] === "\n") {
          chunkSize = j;
          break;
        }
      }
    }

    const chunk = text.slice(i, i + chunkSize);
    onDelta(chunk);

    const delay = charDelay(text[i + chunkSize - 1]);
    await new Promise((resolve) => setTimeout(resolve, delay));

    i += chunkSize;
  }

  return text;
}
