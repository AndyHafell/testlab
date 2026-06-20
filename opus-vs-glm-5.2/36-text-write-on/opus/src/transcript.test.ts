import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildRevealChars,
  totalDurationSec,
  visibleCountAt,
  type ScribeTranscript,
} from "./transcript.ts";

const fixture: ScribeTranscript = {
  text: "Hi yo",
  audio_duration_secs: 2.0,
  words: [
    { text: "Hi", start: 0, end: 1, type: "word" },
    { text: " ", start: 1, end: 1.5, type: "spacing" },
    { text: "yo", start: 1.5, end: 1.9, type: "word" },
    { text: "(laughs)", start: 1.9, end: 2.0, type: "audio_event" },
  ],
};

test("flattens spoken + spacing tokens, skips audio_event, preserves order", () => {
  const chars = buildRevealChars(fixture);
  assert.equal(
    chars.map((c) => c.char).join(""),
    "Hi yo",
    "audio_event tokens must be excluded; spaces preserved",
  );
});

test("characters reveal evenly across each token's time span", () => {
  const chars = buildRevealChars(fixture);
  // "Hi" spans [0,1], length 2 -> H at 0.0, i at 0.5
  assert.equal(chars[0].revealAt, 0);
  assert.equal(chars[1].revealAt, 0.5);
  // space spans [1,1.5], length 1 -> at 1.0
  assert.equal(chars[2].revealAt, 1);
  // "yo" spans [1.5,1.9], length 2 -> y at 1.5, o at 1.7
  assert.equal(chars[3].revealAt, 1.5);
  assert.ok(Math.abs(chars[4].revealAt - 1.7) < 1e-9);
});

test("reveal times are non-decreasing (visible prefix is well-defined)", () => {
  const chars = buildRevealChars(fixture);
  for (let i = 1; i < chars.length; i++) {
    assert.ok(chars[i].revealAt >= chars[i - 1].revealAt);
  }
});

test("visibleCountAt counts characters revealed by time t", () => {
  const chars = buildRevealChars(fixture);
  assert.equal(visibleCountAt(chars, -1), 0);
  assert.equal(visibleCountAt(chars, 0), 1); // just "H"
  assert.equal(visibleCountAt(chars, 0.5), 2); // "Hi"
  assert.equal(visibleCountAt(chars, 1.7), 5); // "Hi yo"
  assert.equal(visibleCountAt(chars, 99), 5); // clamped to total
});

test("totalDurationSec is the later of audio duration and last token end", () => {
  assert.equal(totalDurationSec(fixture), 2.0);
  assert.equal(
    totalDurationSec({ ...fixture, audio_duration_secs: 1.0 }),
    2.0, // last token end wins
  );
});
