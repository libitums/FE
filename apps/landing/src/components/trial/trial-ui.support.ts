// 체험판 ui 테스트 공용 도우미입니다 — test-id로 찾고, 숨김 · 언어 · 접근 이름을 읽습니다.

import { expect } from "vitest";

import type { TrialScriptCopy, TrialTestId } from "./trial-components.contract";

/** 그 test-id를 가진 요소 전부(문서 또는 요소 안). */
export const allByTestId = (scope: ParentNode, id: TrialTestId): Element[] => [
  ...scope.querySelectorAll(`[data-testid="${id}"]`),
];

/** 그 test-id를 가진 요소가 정확히 하나여야 하고, 그것을 돌려준다. */
export function oneByTestId(scope: ParentNode, id: TrialTestId): Element {
  const found = allByTestId(scope, id);
  expect(found, `data-testid="${id}"가 하나여야 한다`).toHaveLength(1);
  return found[0] as Element;
}

/** 요소 자신부터 `root`까지(포함) 거슬러 올라가며 `hidden` 속성이 있는가. */
export function isHiddenWithin(element: Element, root: Element): boolean {
  let current: Element | null = element;
  while (current !== null) {
    if (current.hasAttribute("hidden")) return true;
    if (current === root) return false;
    current = current.parentElement;
  }
  return false;
}

/** 가장 가까운 `lang` 값(자신 포함). */
export const langOf = (element: Element): string | null =>
  element.closest("[lang]")?.getAttribute("lang") ?? null;

export const textOf = (element: Element | null | undefined): string =>
  (element?.textContent ?? "").replace(/\s+/g, " ").trim();

/** 접근 이름 — `aria-label` → `aria-labelledby` → 글. */
export function accessibleNameOf(element: Element): string {
  const label = element.getAttribute("aria-label")?.trim();
  if (label) return label;
  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    const doc = element.ownerDocument;
    const named = labelledBy
      .split(/\s+/)
      .map((id) => textOf(doc.getElementById(id)))
      .join(" ")
      .trim();
    if (named) return named;
  }
  return textOf(element);
}

/** 요소의 모양 — 태그 · 속성 이름(값 제외, 개발 렌더 표식 제외) · 자식 모양. 두 화면의 보기가 같은 꼴인지 비교할 때 쓴다. */
export function shapeOf(element: Element): string {
  const attributes = [...element.attributes]
    .map((attribute) => attribute.name)
    .filter((name) => !name.startsWith("data-astro-"))
    .sort()
    .join(",");
  const children = [...element.children].map(shapeOf).join("");
  return `<${element.tagName.toLowerCase()} ${attributes}>${children}</>`;
}

/** 스크립트가 쓰는 26키(계약 `TrialScriptCopy`). */
export const SCRIPT_COPY_KEYS = [
  "correctAnswer",
  "choiceCorrect",
  "choiceWrong",
  "lineProgress",
  "speak",
  "stop",
  "listening",
  "hint",
  "great",
  "notQuite",
  "youSaid",
  "heardNothing",
  "noticeUnsupported",
  "noticeDenied",
  "noticeUnavailable",
  "completeBodyMissed",
  "cultureFlipToBack",
  "cultureFlipToFront",
  "teaserLabel",
  "teaserTitle",
  "teaserBody",
  "preregSubmit",
  "preregSending",
  "preregRetry",
  "preregDone",
  "preregFailed",
] as const satisfies readonly (keyof TrialScriptCopy)[];

/** 체험판 페이지가 내는 test-id 전부(계약 `TrialTestId` 중 랜딩 링크 둘을 뺀 것). */
export const TRIAL_PAGE_TEST_IDS = [
  "trial",
  "trial-model",
  "trial-noscript",
  "trial-live",
  "trial-bar",
  "trial-exit",
  "trial-progress",
  "trial-veil",
  "trial-step-prologue",
  "trial-step-epilogue",
  "trial-cut",
  "trial-cut-image",
  "trial-cut-speaker",
  "trial-cut-line",
  "trial-cut-roman",
  "trial-cut-translation",
  "trial-cuts-next",
  "trial-step-vocab",
  "trial-vocab-word",
  "trial-vocab-roman",
  "trial-vocab-meaning",
  "trial-vocab-listen",
  "trial-vocab-example",
  "trial-vocab-example-listen",
  "trial-vocab-next",
  "trial-step-image-match",
  "trial-image-match-image",
  "trial-image-match-prompt",
  "trial-step-reply-select",
  "trial-reply-select-line",
  "trial-choice-instruction",
  "trial-choice-listen",
  "trial-option",
  "trial-choice-verdict",
  "trial-choice-next",
  "trial-step-culture",
  "trial-culture-card",
  "trial-culture-image",
  "trial-culture-title",
  "trial-culture-body",
  "trial-culture-tip",
  "trial-culture-flip",
  "trial-culture-next",
  "trial-step-roleplay",
  "trial-roleplay-image",
  "trial-turn",
  "trial-turn-progress",
  "trial-turn-counterpart",
  "trial-turn-line",
  "trial-turn-replay",
  "trial-turn-reply",
  "trial-turn-verdict",
  "trial-turn-heard",
  "trial-turn-answer",
  "trial-turn-notice",
  "trial-turn-speak",
  "trial-turn-hint-button",
  "trial-turn-hint",
  "trial-turn-cant-speak",
  "trial-turn-retry",
  "trial-turn-tiles",
  "trial-tile",
  "trial-turn-composed",
  "trial-turn-check",
  "trial-turn-next",
  "trial-step-clear",
  "trial-clear-title",
  "trial-clear-banner",
  "trial-clear-teaser",
  "trial-clear-image",
  "trial-clear-teaser-title",
  "trial-clear-next",
  "trial-step-complete",
  "trial-prereg",
  "trial-prereg-email",
  "trial-prereg-error",
  "trial-prereg-submit",
  "trial-prereg-privacy",
  "trial-prereg-status",
  "trial-complete-home",
] as const satisfies readonly TrialTestId[];

/** 단계 section은 `aria-labelledby`로 자기 `h2[data-step-heading][tabindex=-1]`를 가리킨다. */
export function expectStepHeading(section: Element): Element {
  expect(section.tagName, "단계는 section").toBe("SECTION");
  const headingId = section.getAttribute("aria-labelledby");
  expect(headingId, "section aria-labelledby").toBeTruthy();
  const heading = section.ownerDocument.getElementById(headingId ?? "");
  expect(heading, `aria-labelledby="${headingId}" 대상`).not.toBeNull();
  expect(section.contains(heading)).toBe(true);
  expect(heading?.tagName).toBe("H2");
  expect(heading?.hasAttribute("data-step-heading")).toBe(true);
  expect(heading?.getAttribute("tabindex")).toBe("-1");
  return heading as Element;
}

/** 버튼은 `type=button`(폼 제출 버튼은 `submit`)이고 접근 이름이 비지 않는다. */
export function expectButton(
  element: Element,
  name?: string,
  type: "button" | "submit" = "button",
): void {
  expect(element.tagName, `${element.getAttribute("data-testid")} 태그`).toBe("BUTTON");
  expect(element.getAttribute("type")).toBe(type);
  const accessible = accessibleNameOf(element);
  if (name === undefined) expect(accessible).not.toBe("");
  else expect(accessible).toBe(name);
}
