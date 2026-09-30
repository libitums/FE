import backgroundSource from "./assets/temporary/background-cafe-exterior-day.png";
import neutralSource from "./assets/temporary/character-jimin-neutral.png";
import smileSource from "./assets/temporary/character-jimin-smile.png";
import type { VisualNovelArtworkBundle, VisualNovelArtworkId } from "./visual-novel.contract";

// Rspeedy의 URL을 그대로 사용합니다. 개발 서버 URL은 원격으로 읽고,
// 프로덕션 /static/ 경로는 iOS Host의 BundledMediaResourceFetcher가 해석합니다.
const artworkBundle: VisualNovelArtworkBundle = {
  "cafe-exterior-day": {
    id: "cafe-exterior-day",
    kind: "background",
    source: backgroundSource,
  },
  "jimin-neutral": {
    id: "jimin-neutral",
    kind: "character",
    characterId: "jimin",
    source: neutralSource,
  },
  "jimin-smile": {
    id: "jimin-smile",
    kind: "character",
    characterId: "jimin",
    source: smileSource,
  },
};

export function artworkFor<Id extends VisualNovelArtworkId>(id: Id): VisualNovelArtworkBundle[Id] {
  return artworkBundle[id];
}
