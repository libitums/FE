import { useState } from "@lynx-js/react";

import type { VisualNovelSceneProps } from "./visual-novel.contract";
import "./visual-novel.css";

export function VisualNovelScene({
  beat,
  backgroundArtwork,
  characterArtwork,
  replaying,
}: VisualNovelSceneProps) {
  const [loadedBackgroundSource, setLoadedBackgroundSource] = useState<string | null>(null);
  const [loadedCharacterSource, setLoadedCharacterSource] = useState<string | null>(null);
  const [failedBackgroundSource, setFailedBackgroundSource] = useState<string | null>(null);
  const [failedCharacterSource, setFailedCharacterSource] = useState<string | null>(null);
  const backgroundLoaded = loadedBackgroundSource === backgroundArtwork.source;
  const characterLoaded = loadedCharacterSource === characterArtwork.source;
  const backgroundError = failedBackgroundSource === backgroundArtwork.source;
  const characterError = failedCharacterSource === characterArtwork.source;

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
          bindload={() => setLoadedBackgroundSource(backgroundArtwork.source)}
          binderror={() => setFailedBackgroundSource(backgroundArtwork.source)}
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
          bindload={() => setLoadedCharacterSource(characterArtwork.source)}
          binderror={() => setFailedCharacterSource(characterArtwork.source)}
          data-testid={`visual-novel-character-${characterArtwork.id}`}
          src={characterArtwork.source}
        />
      )}
    </view>
  );
}
