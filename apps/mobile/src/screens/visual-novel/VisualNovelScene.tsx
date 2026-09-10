import { useState } from "@lynx-js/react";

import type { VisualNovelSceneProps } from "./visual-novel.contract";
import "./visual-novel.css";

export function VisualNovelScene({
  beat,
  backgroundArtwork,
  characterArtwork,
  replaying,
}: VisualNovelSceneProps) {
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [characterLoaded, setCharacterLoaded] = useState(false);
  const [backgroundError, setBackgroundError] = useState(false);
  const [characterError, setCharacterError] = useState(false);

  return (
    <view
      className="visual-novel-scene"
      data-testid={`visual-novel-scene-${beat.id}`}
      data-replaying={String(replaying)}
    >
      {!backgroundError && (
        <image
          accessibility-element={false}
          className={
            backgroundLoaded
              ? "visual-novel-background visual-novel-image-loaded"
              : "visual-novel-background"
          }
          mode="aspectFill"
          bindload={() => setBackgroundLoaded(true)}
          binderror={() => setBackgroundError(true)}
          data-testid={`visual-novel-background-${backgroundArtwork.id}`}
          src={backgroundArtwork.source}
        />
      )}
      {!characterError && (
        <image
          accessibility-element={false}
          className={
            characterLoaded
              ? "visual-novel-character visual-novel-image-loaded"
              : "visual-novel-character"
          }
          mode="aspectFit"
          bindload={() => setCharacterLoaded(true)}
          binderror={() => setCharacterError(true)}
          data-testid={`visual-novel-character-${characterArtwork.id}`}
          src={characterArtwork.source}
        />
      )}
    </view>
  );
}
