import React from "react";
import { Composition } from "remotion";
import { Typewriter } from "./Typewriter";
import { totalDurationSec, type ScribeTranscript } from "./transcript";
import transcriptJson from "../public/transcript.json";

const FPS = 30;
/** Extra frames held on the finished sentence after the last character. */
const TAIL_FRAMES = 30;

const transcript = transcriptJson as ScribeTranscript;

export const RemotionRoot: React.FC = () => {
  const durationInFrames =
    Math.ceil(totalDurationSec(transcript) * FPS) + TAIL_FRAMES;

  return (
    <Composition
      id="WriteOn"
      component={Typewriter}
      durationInFrames={durationInFrames}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
