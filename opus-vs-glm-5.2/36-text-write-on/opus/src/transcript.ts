export type ScribeTokenType = "word" | "spacing" | "audio_event";

export interface ScribeToken {
  text: string;
  start: number;
  end: number;
  type: ScribeTokenType;
  logprob?: number;
}

export interface ScribeTranscript {
  language_code?: string;
  text: string;
  words: ScribeToken[];
  audio_duration_secs?: number;
}

export interface RevealChar {
  char: string;
  /** Time (seconds) at which this character becomes visible. */
  revealAt: number;
}

/**
 * Flatten an ElevenLabs Scribe transcript into an ordered list of characters,
 * each tagged with the moment it should appear. Within a token spanning
 * [start, end], character i of L reveals at start + (i / L) * (end - start),
 * so typing speed tracks the spoken pace of each word. Spoken text and the
 * spaces between words (carried by `spacing` tokens) are both included;
 * `audio_event` markers like "(laughter)" are skipped.
 */
export function buildRevealChars(transcript: ScribeTranscript): RevealChar[] {
  const chars: RevealChar[] = [];
  for (const token of transcript.words) {
    if (token.type === "audio_event") continue;
    const span = Math.max(0, token.end - token.start);
    const length = token.text.length;
    for (let i = 0; i < length; i++) {
      const frac = length > 0 ? i / length : 0;
      chars.push({ char: token.text[i], revealAt: token.start + frac * span });
    }
  }
  return chars;
}

/** Total animation length: the later of the audio duration and the last token's end. */
export function totalDurationSec(transcript: ScribeTranscript): number {
  const fromAudio = transcript.audio_duration_secs ?? 0;
  const lastEnd = transcript.words.length
    ? transcript.words[transcript.words.length - 1].end
    : 0;
  return Math.max(fromAudio, lastEnd);
}

/** Number of characters visible at time t (seconds). */
export function visibleCountAt(chars: RevealChar[], t: number): number {
  let count = 0;
  for (const c of chars) {
    if (c.revealAt <= t) count++;
  }
  return count;
}
