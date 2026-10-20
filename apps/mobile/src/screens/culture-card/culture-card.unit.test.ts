import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import type { LessonPosition } from "../learning/activity-finish";
import {
  cultureCardActionOf,
  cultureCardFaceClassName,
  cultureCardLabelOf,
  cultureCardPhotoOf,
  cultureCardSessionReducer,
  cultureCardStepOf,
  initialCultureCardSessionState,
} from "./culture-card";
import { cultureCardEn } from "../../lib/ui-copy-en-catalog";
import type { CultureCardQuestion, CultureCardSessionState } from "./culture-card.contract";

// `unit` 계층: 문화 카드 활동의 걸음 계산 · 리듀서 · 버튼 동작 · 면 클래스 · 사진 선택만 봅니다(순수 함수).
// 끝의 describe 하나는 CSS 텍스트를 읽습니다(모션 토큰 — ADR-0053 D8의 unit 칸).

const middle: LessonPosition = { offset: 0, total: 6, last: false };
const lastActivity: LessonPosition = { offset: 3, total: 6, last: true };

describe("cultureCardStepOf (CC1)", () => {
  test.each([
    [0, "advance"],
    [1, "advance"],
    [2, "finish"],
  ] as const)("CC1. 레슨 없이 3장 중 %s번째는 %s다", (cardIndex, expected) => {
    expect(cultureCardStepOf(undefined, cardIndex, 3)).toBe(expected);
  });

  test("CC1. 레슨 중간(last: false)의 마지막 카드는 hand-off다", () => {
    expect(cultureCardStepOf(middle, 0, 3)).toBe("advance");
    expect(cultureCardStepOf(middle, 1, 3)).toBe("advance");
    expect(cultureCardStepOf(middle, 2, 3)).toBe("hand-off");
  });

  test("CC1. 레슨 끝(last: true)의 마지막 카드는 finish다", () => {
    expect(cultureCardStepOf(lastActivity, 1, 3)).toBe("advance");
    expect(cultureCardStepOf(lastActivity, 2, 3)).toBe("finish");
  });

  test("CC1. 카드가 한 장뿐이면 곧바로 finish 또는 hand-off다", () => {
    expect(cultureCardStepOf(undefined, 0, 1)).toBe("finish");
    expect(cultureCardStepOf(lastActivity, 0, 1)).toBe("finish");
    expect(cultureCardStepOf(middle, 0, 1)).toBe("hand-off");
  });
});

describe("cultureCardSessionReducer (CC2 · CC3)", () => {
  test("CC2. 초기 상태는 첫 카드의 앞면이고 뒤집은 적이 없다", () => {
    expect(initialCultureCardSessionState).toEqual({ cardIndex: 0, face: "front", flipped: false });
  });

  test("CC2. flip은 앞 → 뒤 → 앞으로 면을 바꾸고 뒤집었다고 적는다(카드 번호는 그대로)", () => {
    const back = cultureCardSessionReducer(initialCultureCardSessionState, { type: "flip" });
    expect(back).toEqual({ cardIndex: 0, face: "back", flipped: true });

    const front = cultureCardSessionReducer(back, { type: "flip" });
    expect(front).toEqual({ cardIndex: 0, face: "front", flipped: true });
  });

  test("CC2. nextCard는 카드 번호를 하나 올리고 앞면으로 돌려놓으며 뒤집은 기록을 지운다", () => {
    const back: CultureCardSessionState = { cardIndex: 1, face: "back", flipped: true };
    const next = cultureCardSessionReducer(back, { type: "nextCard" });

    expect(next).toEqual({ cardIndex: 2, face: "front", flipped: false });
    expect(next).not.toBe(back);
  });

  test("CC3. 입력 상태는 바뀌지 않고 같은 입력은 같은 결과다", () => {
    const state: CultureCardSessionState = { cardIndex: 4, face: "back", flipped: true };
    const snapshot = structuredClone(state);

    expect(cultureCardSessionReducer(state, { type: "nextCard" })).toEqual(
      cultureCardSessionReducer(state, { type: "nextCard" }),
    );
    expect(cultureCardSessionReducer(state, { type: "flip" })).toEqual(
      cultureCardSessionReducer(state, { type: "flip" }),
    );
    expect(state).toEqual(snapshot);
    expect(cultureCardStepOf(middle, 1, 3)).toBe(cultureCardStepOf(middle, 1, 3));
  });
});

describe("cultureCardActionOf (CC4)", () => {
  test.each(["advance", "hand-off", "finish"] as const)(
    "CC4. 앞면의 아래 버튼은 걸음(%s)과 무관하게 뒤집기다",
    (step) => {
      expect(cultureCardActionOf("front", step)).toBe("flip");
    },
  );

  test.each(["advance", "hand-off", "finish"] as const)(
    "CC4. 뒷면의 아래 버튼은 걸음 그대로(%s)다",
    (step) => {
      expect(cultureCardActionOf("back", step)).toBe(step);
    },
  );
});

describe("cultureCardFaceClassName (CC5)", () => {
  test("CC5. 처음 선 면(뒤집기 전)은 움직임 없이 기본 클래스만이다", () => {
    expect(cultureCardFaceClassName("front", false, "standard")).toBe("culture-card-activity-face");
    expect(cultureCardFaceClassName("front", false, "reduced")).toBe("culture-card-activity-face");
  });

  test("CC5. 뒤집어 선 면은 표준 움직임에서만 뒤집기 클래스가 붙고, 동작 줄이기면 즉시 바뀐다", () => {
    // 면마다 클래스 이름이 달라야 노드를 다시 세우지 않고도 클래스가 바뀌는 순간 움직임이 처음부터 돕니다.
    expect(cultureCardFaceClassName("back", true, "standard")).toBe(
      "culture-card-activity-face culture-card-activity-face-flip-back",
    );
    expect(cultureCardFaceClassName("front", true, "standard")).toBe(
      "culture-card-activity-face culture-card-activity-face-flip-front",
    );
    expect(cultureCardFaceClassName("back", true, "reduced")).toBe("culture-card-activity-face");
  });
});

describe("cultureCardPhotoOf (CC6)", () => {
  test("CC6. 주소가 있고 실패하지 않았으면 그 주소다", () => {
    expect(cultureCardPhotoOf("https://cdn/a.jpg", null)).toBe("https://cdn/a.jpg");
    expect(cultureCardPhotoOf("https://cdn/a.jpg", "https://cdn/b.jpg")).toBe("https://cdn/a.jpg");
  });

  test("CC6. 주소가 없거나 그 주소가 실패했으면 null이다(브랜드 면이 선다)", () => {
    expect(cultureCardPhotoOf(null, null)).toBeNull();
    expect(cultureCardPhotoOf("https://cdn/a.jpg", "https://cdn/a.jpg")).toBeNull();
  });
});

describe("cultureCardLabelOf (CC8)", () => {
  const card: CultureCardQuestion = {
    title: "편의점 봉투",
    titleTranslation: "Bags",
    titleRomanization: "pyeonuijeom bongtu",
    body: "Bags cost extra.",
    koreanBody: "봉투는 따로 사요.",
    imageUrl: null,
  };
  const bare: CultureCardQuestion = {
    ...card,
    titleTranslation: null,
    titleRomanization: null,
    koreanBody: null,
  };
  const at = (question: CultureCardQuestion) => ({ position: 2, total: 3, card: question });

  test("CC8. 앞면 이름은 위치 · 면 → 두 제목 → 뒤집기 안내다(머리글 CULTURE는 빠진다)", () => {
    expect(cultureCardLabelOf("front", at(card), cultureCardEn)).toBe(
      "Culture card 2 of 3, front. 편의점 봉투, Bags. Tap to flip.",
    );
    expect(cultureCardLabelOf("front", at(bare), cultureCardEn)).toBe(
      "Culture card 2 of 3, front. 편의점 봉투. Tap to flip.",
    );
  });

  test("CC8. 뒷면 이름은 위치 · 면 → 제목 → 발음 → 영어 본문 → In Korean → 되뒤집기 안내이고 빈 줄은 빠진다", () => {
    expect(cultureCardLabelOf("back", at(card), cultureCardEn)).toBe(
      "Culture card 2 of 3, back. 편의점 봉투. Pronunciation: pyeonuijeom bongtu. Bags cost extra. " +
        "In Korean: 봉투는 따로 사요. Tap to flip back.",
    );
    expect(cultureCardLabelOf("back", at(bare), cultureCardEn)).toBe(
      "Culture card 2 of 3, back. 편의점 봉투. Bags cost extra. Tap to flip back.",
    );
  });
});

// 이 describe는 ui 계층 소유입니다(CSS 텍스트 — 파일을 읽어 정규식으로 봅니다). unit 명령으로 돌 뿐입니다.
describe("culture-card-activity.css (CC7)", () => {
  const raw = readFileSync(
    resolve(process.cwd(), "src/screens/culture-card/culture-card-activity.css"),
    "utf8",
  );
  const css = raw.replace(/\/\*[\s\S]*?\*\//g, "");
  const ruleBody = (selector: string): string =>
    new RegExp(`(?:^|[}])\\s*\\.${selector}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";
  const keyframe = (name: string, edge: "from" | "to"): string =>
    new RegExp(`@keyframes\\s+${name}\\s*\\{[\\s\\S]*?${edge}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ??
    "";

  test("CC7. 뒤집기는 가로 배율 keyframe이고 시간 · 곡선은 모션 토큰이다", () => {
    expect(css).not.toContain("rotateY");
    for (const face of ["front", "back"]) {
      const name = `culture-card-activity-face-flip-${face}`;
      expect(keyframe(name, "from")).toMatch(/transform:\s*scaleX\(0\)/);
      expect(keyframe(name, "to")).toMatch(/transform:\s*scaleX\(1\)/);
      expect(ruleBody(name)).toMatch(
        new RegExp(
          `animation:\\s*${name}\\s+var\\(--libitum-motion-duration-[a-z0-9-]+\\)\\s+var\\(--libitum-motion-easing-[a-z-]+\\)`,
        ),
      );
    }
  });

  test("CC7b. 면마다 이름이 다른 keyframe 둘이고 회전축 선언은 더하지 않는다", () => {
    const front = "culture-card-activity-face-flip-front";
    const back = "culture-card-activity-face-flip-back";
    expect(front).not.toBe(back);
    expect(css).toContain(`@keyframes ${front}`);
    expect(css).toContain(`@keyframes ${back}`);
    expect(ruleBody("culture-card-activity-face")).not.toContain("transform-origin");
    expect(css).not.toContain("perspective");
    expect(css).not.toContain("backface-visibility");
  });

  test("CC7. 미디어 질의 · 시간 리터럴이 없다(ADR-0053 D1)", () => {
    expect(css).not.toMatch(/@media/);
    expect(css).not.toMatch(/\b\d+m?s\b/);
  });
});
