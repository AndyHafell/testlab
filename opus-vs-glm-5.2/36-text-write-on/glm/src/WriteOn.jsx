import React from 'react';
import {
  AbsoluteFill,
  Audio,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';

const BG = '#0b1d3a'; // dark navy
const TEXT = '#ffffff'; // white

/**
 * Word-synced write-on.
 *
 * The full sentence is laid out once (positions never move), and each word
 * "writes on" left-to-right across its own [start, end] spoken window via a
 * clip-path wipe. Before a word starts it is fully clipped (invisible, space
 * held); after it ends it is fully revealed.
 */
export const WriteOn = ({words}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps; // current time in seconds

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Audio src={staticFile('sample.mp3')} />
      <div
        style={{
          fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
          color: TEXT,
          fontSize: 88,
          fontWeight: 800,
          lineHeight: 1.3,
          textAlign: 'center',
          maxWidth: 1100,
          padding: '0 40px',
        }}
      >
        {words.map((w, i) => {
          // Write-on progress for this word, 0 -> 1 across [start, end].
          const prog =
            w.end > w.start
              ? interpolate(t, [w.start, w.end], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                })
              : t >= w.start
              ? 1
              : 0;
          const hiddenFromRight = (1 - prog) * 100;
          return (
            <React.Fragment key={i}>
              <span
                style={{
                  display: 'inline-block',
                  clipPath: `inset(0 ${hiddenFromRight}% 0 0)`,
                  WebkitClipPath: `inset(0 ${hiddenFromRight}% 0 0)`,
                }}
              >
                {w.text}
              </span>
              {i < words.length - 1 ? ' ' : null}
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
