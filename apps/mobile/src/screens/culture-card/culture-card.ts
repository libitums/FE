// 문화 카드 활동의 순수 로직입니다. UI를 import하지 않습니다.

import type { Motion } from "@libitums/ui-lynx/motion";

import type { LessonPosition } from "../learning/activity-finish";
import type {
  CultureCardAction,
  CultureCardCopy,
  CultureCardFace,
  CultureCardLabelInput,
  CultureCardSessionAction,
  CultureCardSessionState,
  CultureCardStep,
} from "./culture-card.contract";

export const initialCultureCardSessionState: CultureCardSessionState = {
  cardIndex: 0,
  face: "front",
  flipped: false,
};

/**
 * `flip`은 면을 바꾸고 뒤집었다고 적습니다. `nextCard`는 카드 번호를 하나 올리고 앞면으로 돌려놓습니다 — 다음 카드의
 * 앞면은 뒤집기가 아니라 셸의 문항 전환으로 들어오므로 `flipped`를 지웁니다. 번호의 상한은 화면이 지킵니다.
 */
export function cultureCardSessionReducer(
  state: CultureCardSessionState,
  action: CultureCardSessionAction,
): CultureCardSessionState {
  switch (action.type) {
    case "flip":
      return {
        cardIndex: state.cardIndex,
        face: state.face === "front" ? "back" : "front",
        flipped: true,
      };
    case "nextCard":
      return { cardIndex: state.cardIndex + 1, face: "front", flipped: false };
  }
}

/** 마지막 카드 전은 advance, 마지막이면 레슨 중간은 hand-off, 그 밖은 finish입니다. */
export function cultureCardStepOf(
  lesson: LessonPosition | undefined,
  cardIndex: number,
  total: number,
): CultureCardStep {
  if (cardIndex < total - 1) return "advance";
  return lesson !== undefined && !lesson.last ? "hand-off" : "finish";
}

/** 앞면의 아래 버튼은 늘 뒤집기입니다 — 본문(뒷면)을 보지 않고 넘어가지 않게 합니다. 뒷면은 걸음 그대로입니다. */
export function cultureCardActionOf(
  face: CultureCardFace,
  step: CultureCardStep,
): CultureCardAction {
  return face === "front" ? "flip" : step;
}

const faceClass = "culture-card-activity-face";

/**
 * 면 상자의 클래스입니다. 뒤집어 선 면만 표준 움직임에서 회전해 들어옵니다. 동작 줄이기는 회전을 걷어 **즉시** 바꿉니다
 * (ADR-0053 D3 「회전은 즉시」).
 */
export function cultureCardFaceClassName(flipped: boolean, motion: Motion): string {
  return flipped && motion === "standard" ? `${faceClass} ${faceClass}-flip` : faceClass;
}

/** 앞면에 세울 사진 주소입니다. 주소가 없거나 그 주소가 한 번 실패했으면 `null` — 브랜드 면이 섭니다. */
export function cultureCardPhotoOf(
  imageUrl: string | null,
  failedUrl: string | null,
): string | null {
  return imageUrl === null || imageUrl === failedUrl ? null : imageUrl;
}

/**
 * 카드의 접근성 이름입니다. 카드가 접근성 요소 하나라 이름이 보이는 글을 대신 읽습니다 — 위치 · 면, 그 면의 글, 뒤집을
 * 수 있음 순서입니다. 빈 줄은 이름에도 들지 않습니다. 앞면의 머리글(`CULTURE`)은 셸의 머리 라벨 `Culture`와 겹쳐 빼고,
 * 카운터 숫자는 첫 문장의 위치가 대신합니다.
 */
export function cultureCardLabelOf(
  face: CultureCardFace,
  { position, total, card }: CultureCardLabelInput,
  copy: CultureCardCopy,
): string {
  if (face === "front") {
    const heading =
      card.titleTranslation === null ? card.title : `${card.title}, ${card.titleTranslation}`;
    return [copy.frontPlace(position, total), `${heading}.`, `${copy.tapToFlip}.`].join(" ");
  }
  return [
    copy.backPlace(position, total),
    `${card.title}.`,
    card.titleRomanization === null ? null : `${copy.pronunciation(card.titleRomanization)}.`,
    card.body,
    card.koreanBody === null ? null : `${copy.koreanBodyTitle}: ${card.koreanBody}`,
    copy.flipBackHint,
  ]
    .filter((part) => part !== null)
    .join(" ");
}
