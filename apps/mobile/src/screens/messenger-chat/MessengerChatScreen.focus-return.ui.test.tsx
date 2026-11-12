import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup } from "@lynx-js/react/testing-library";

import * as inputFocus from "./chat-input-focus";
import { advance, clearBackHandlers, mountChat, systemBack, tapId } from "./chat-ui.test-support";
import { chatSettingsTestIds } from "./chat-settings.contract";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(접근성 C1, a11y-findings): 겹침이 닫힌 뒤 접근성 초점이 돌아갈 일곱 origin 모두 — 복원 호출의 대상 id를 가진
// **접근성 요소**가 렌더 트리에 실제로 있어야 한다(기존 테스트는 복원 함수를 모킹해 인자 문자열만 봤다). 그리고 복원은
// 뒤 화면의 accessibility-elements-hidden이 풀린 다음 프레임(16 ms)에 부른다 — 같은 커밋에서 부르면 iOS가 아직 숨은 요소를
// 무시할 수 있다.

vi.mock("./chat-input-focus", () => ({
  focusPhoneInput: vi.fn<() => void>(),
  blurPhoneInput: vi.fn<() => void>(),
  clearPhoneInput: vi.fn<() => void>(),
  restoreAccessibilityFocus: vi.fn<(testId: string) => void>(),
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const restore = (): ReturnType<typeof vi.fn> => vi.mocked(inputFocus.restoreAccessibilityFocus);

/** 해당 id를 가진 요소가 접근성 요소(accessibility-element)인지 봅니다. */
function expectAccessibleTarget(id: string): void {
  const el = document.querySelector(`[id="${id}"]`);
  expect(el, `#${id} 요소`).not.toBeNull();
  expect(el?.getAttribute("accessibility-element"), `#${id} accessibility-element`).toBe("true");
}

type Flow = {
  readonly origin: string;
  readonly open: () => void;
  readonly close: () => void;
};

const flows: readonly Flow[] = [
  {
    origin: "more",
    open: () => tapId(ids.more),
    close: () => tapId(ids.more),
  },
  {
    origin: "settings",
    open: () => tapId(ids.settings),
    close: () => tapId(ids.sidebarClose),
  },
  {
    origin: "snapshot-pill",
    open: () => tapId(ids.snapshot),
    close: () => tapId(ids.askCancel),
  },
  {
    origin: "voice-pill",
    open: () => tapId(ids.snapVoice),
    close: () => tapId(ids.askCancel),
  },
  {
    origin: "sidebar-story-point",
    open: () => {
      tapId(ids.settings);
      tapId(ids.sidebarStoryPoint);
    },
    close: () => {
      systemBack();
    },
  },
  {
    origin: "sidebar-delete",
    open: () => {
      tapId(ids.settings);
      tapId(ids.sidebarDelete);
    },
    close: () => {
      systemBack();
    },
  },
  {
    origin: "sidebar-feedback-mode",
    open: () => {
      tapId(ids.settings);
      tapId(chatSettingsTestIds.sidebarFeedback);
    },
    close: () => {
      systemBack();
    },
  },
  {
    origin: "sidebar-coins",
    open: () => {
      tapId(ids.settings);
      tapId(ids.sidebarGetCoins);
    },
    close: () => {
      systemBack();
    },
  },
];

for (const flow of flows) {
  test(`C1. ${flow.origin}: 겹침을 닫으면 다음 프레임에 그 단추로 초점을 돌리고, 그 id의 접근성 요소가 있다`, () => {
    mountChat();
    flow.open();
    flow.close();
    expect(restore()).not.toHaveBeenCalled();

    advance(16);

    expect(restore()).toHaveBeenCalledTimes(1);
    const target = restore().mock.calls[0]?.[0] as string;
    expectAccessibleTarget(target);
  });
}

// ⟨ADR-0126 기기 확인⟩ 사이드바 위 시트(교정 방식)를 닫아 사이드바로 돌아와도, 누른 단추가 사라지며 숨은 <input>이 받은 초점을
// 다음 프레임에 내린다 — Android에서 휴대폰 키보드가 떴다.
test("CS-UI13. 교정 방식 시트를 닫아 사이드바로 돌아오면 다음 프레임에 숨은 입력의 초점을 내린다", () => {
  mountChat();
  tapId(ids.settings);
  tapId(chatSettingsTestIds.sidebarFeedback);
  vi.mocked(inputFocus.blurPhoneInput).mockClear();
  systemBack();
  expect(inputFocus.blurPhoneInput).not.toHaveBeenCalled();

  advance(16);

  expect(inputFocus.blurPhoneInput).toHaveBeenCalledTimes(1);
});
