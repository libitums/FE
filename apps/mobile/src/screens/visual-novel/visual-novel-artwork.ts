import backgroundSource from "./assets/temporary/background-cafe-exterior-day.png";
import neutralSource from "./assets/temporary/character-jimin-neutral.png";
import smileSource from "./assets/temporary/character-jimin-smile.png";
import type { VisualNovelArtworkBundle, VisualNovelArtworkId } from "./visual-novel.contract";

// Lynx iOS resolves app-bundle images only through its `Resource/` redirect path.
// Rspeedy emits the imported files below `static/`, which bundle:host mirrors under
// Host.app/Resource/static without changing the hashed filename.
const hostResource = (source: string): string => `Resource/${source.replace(/^\/+/, "")}`;

const artworkBundle: VisualNovelArtworkBundle = {
  "cafe-exterior-day": {
    id: "cafe-exterior-day",
    kind: "background",
    source: hostResource(backgroundSource),
  },
  "jimin-neutral": {
    id: "jimin-neutral",
    kind: "character",
    characterId: "jimin",
    source: hostResource(neutralSource),
  },
  "jimin-smile": {
    id: "jimin-smile",
    kind: "character",
    characterId: "jimin",
    source: hostResource(smileSource),
  },
};

export function artworkFor<Id extends VisualNovelArtworkId>(id: Id): VisualNovelArtworkBundle[Id] {
  return artworkBundle[id];
}
