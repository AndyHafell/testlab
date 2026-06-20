import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  buildRevealChars,
  visibleCountAt,
  type ScribeTranscript,
} from "./transcript";
import transcriptJson from "../public/transcript.json";

const NAVY = "#0B1E33";
const TEXT = "#F5F7FA";
const CARET = "#5BC8FF";

/** A char revealed within this many seconds of "now" means we're actively typing. */
const TYPING_WINDOW = 0.09;
/** Idle caret blink period (seconds). */
const BLINK_PERIOD = 1.06;

const transcript = transcriptJson as ScribeTranscript;

export const Typewriter: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const chars = useMemo(() => buildRevealChars(transcript), []);

  const count = visibleCountAt(chars, t);
  const visibleText = chars
    .slice(0, count)
    .map((c) => c.char)
    .join("");

  const done = count >= chars.length;
  const lastRevealAt = count > 0 ? chars[count - 1].revealAt : -Infinity;
  const typing = !done && t - lastRevealAt < TYPING_WINDOW;
  const blinkOn = t % BLINK_PERIOD < BLINK_PERIOD / 2;
  const caretVisible = typing ? true : blinkOn;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: NAVY,
        justifyContent: "center",
        alignItems: "center",
        padding: "0 14%",
      }}
    >
      <Audio src={staticFile("sample.mp3")} />
      <div
        style={{
          fontFamily:
            "ui-monospace, 'SF Mono', Menlo, Monaco, 'Cascadia Code', 'Roboto Mono', monospace",
          fontSize: 76,
          fontWeight: 600,
          lineHeight: 1.4,
          letterSpacing: "0.01em",
          color: TEXT,
          textAlign: "left",
          maxWidth: "72%",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {visibleText}
        <span
          style={{
            display: "inline-block",
            width: "0.58em",
            height: "1.02em",
            marginLeft: "0.04em",
            transform: "translateY(0.16em)",
            borderRadius: 3,
            backgroundColor: CARET,
            opacity: caretVisible ? 1 : 0,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
