import React from 'react';
import {Composition} from 'remotion';
import {WriteOn} from './WriteOn';
import transcript from '../transcript.json';

const FPS = 30;
const TAIL_SECONDS = 0.6;

// Scribe returns word + spacing tokens; we animate only the words.
const words = transcript.words.filter((w) => w.type === 'word');

// Total duration = spoken audio + a short hold at the end so the final
// word is not cut off.
const durationInFrames = Math.max(
  1,
  Math.ceil((transcript.audio_duration_secs + TAIL_SECONDS) * FPS)
);

export const Root = () => (
  <Composition
    id="WriteOn"
    component={WriteOn}
    durationInFrames={durationInFrames}
    fps={FPS}
    width={1280}
    height={720}
    defaultProps={{words}}
  />
);
