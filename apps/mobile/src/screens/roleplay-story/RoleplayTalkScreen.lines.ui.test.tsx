import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { ChoiceRomanization } from "../../lib/session-options";
import { recognized, stubSpeechHost } from "../../lib/speech-host.test-support";
import { UiCopyContext, uiCopyFor } from "../../lib/ui-copy";
import type { CatalogRoleplayTurn } from "../catalog-final/catalog-final.contract";
import { RoleplayTalkScreen } from "./RoleplayTalkScreen";

// `ui` 계층(2026-11-27 제보 — zh-TW로 뜻이 영어): 대사 상자 아래 줄 · 오답 패널의 뜻 · 로마자 스위치(ADR-0188)를 실제 컴포넌트로
// 본다. 앱 언어는 문구표(`UiCopyContext`), 뜻은 이미 그 언어로 바뀐 턴(카탈로그가 바꿈)으로 준다.

const insets = { top: 0, bottom: 0, left: 0, right: 0 };
const turn = (
  id: string,
  line: { ko: string; roman: string | null; en: string | null },
  accepted: string,
  meaning: string,
): CatalogRoleplayTurn => ({
  id,
  instruction: "What do you say?",
  line,
  tiles: [{ ko: accepted, roman: "" }],
  accepted: [accepted],
  replyTranslation: meaning,
  imageUrl: null,
});
const turns = [
  turn(
    "RP-01",
    { ko: "봉투 드릴까요?", roman: "bongtu deurilkkayo?", en: "需要塑膠袋嗎？" },
    "아니요, 괜찮아요.",
    "不用了，沒關係。",
  ),
  turn(
    "RP-02",
    { ko: "삼천 원입니다.", roman: "samcheon wonimnida.", en: "三千韓元。" },
    "카드로 할게요.",
    "我要刷卡。",
  ),
] as const;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mount(romanization?: ChoiceRomanization) {
  render(
    <UiCopyContext.Provider value={uiCopyFor("zh-TW")}>
      <RoleplayTalkScreen
        insets={insets}
        ordinal={1}
        counterpartName="점원"
        turns={turns}
        wildcards={[]}
        onFinish={vi.fn()}
        onExit={vi.fn()}
        {...(romanization === undefined ? {} : { romanization })}
      />
    </UiCopyContext.Provider>,
  );
}

const id = (testId: string) => screen.getByTestId(testId);
const romanOf = (testId: string) =>
  within(id(testId)).queryByTestId("ui-lynx-visual-novel-dialog-romanization");

test("[RT-L1] 앱 언어(zh-TW) — 패널 머리 · 뜻 · 상대 줄 뜻이 그 언어다", () => {
  stubSpeechHost();
  mount();
  expect(id("roleplay-talk-panel")).toHaveTextContent("你的台詞");
  expect(id("roleplay-talk-meaning")).toHaveTextContent("不用了，沒關係。");
  expect(
    within(id("roleplay-talk-line")).getByTestId("ui-lynx-visual-novel-dialog-translation"),
  ).toHaveTextContent("需要塑膠袋嗎？");
});

test("[RT-L2] 로마자 스위치를 끄면(기본) 상대 줄 · 내 말풍선 · 반응에 로마자 줄이 없다", () => {
  stubSpeechHost({ result: () => recognized("아니요 괜찮아요") });
  mount();
  expect(romanOf("roleplay-talk-line")).toBeNull();
  fireEvent.tap(id("roleplay-mic-button"), {});
  expect(id("roleplay-talk-reply")).not.toHaveTextContent("aniyo");
  expect(romanOf("roleplay-talk-reaction")).toBeNull();
});

test("[RT-L3] 로마자 스위치를 켜면 상대 줄 · 내 말풍선 · 반응에 로마자 줄이 선다", () => {
  stubSpeechHost({ result: () => recognized("아니요 괜찮아요") });
  mount("shown");
  expect(romanOf("roleplay-talk-line")).toHaveTextContent("bongtu deurilkkayo?");
  fireEvent.tap(id("roleplay-mic-button"), {});
  expect(id("roleplay-talk-reply")).toHaveTextContent("aniyo");
  expect(romanOf("roleplay-talk-reaction")).toHaveTextContent("samcheon wonimnida.");
});

test("[RT-L4] 오답 패널은 정답 문장 아래 그 문장의 뜻(앱 언어)을 보인다", () => {
  const host = stubSpeechHost();
  mount();
  fireEvent.tap(id("roleplay-mic-button"), {});
  act(() => {
    host.pending[0]?.({ status: "recognized", text: "네 괜찮아요", isFinal: true });
  });
  expect(id("roleplay-talk-verdict")).toHaveTextContent("差一點");
  expect(id("roleplay-talk-answer-meaning")).toHaveTextContent("不用了，沒關係。");
});
