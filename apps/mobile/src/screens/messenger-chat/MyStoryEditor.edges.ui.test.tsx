import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { clearBackHandlers, nativeInput, tapId } from "./chat-ui.test-support";
import { editorCapsOf } from "./my-story-editor";
import { myStoriesTestIds as ids } from "./my-stories.contract";
import { myStory, wordChoice } from "./my-stories.test-support";
import { MyStoryEditor } from "./MyStoryEditor";
import { MyTextStoryCard } from "./MyStoryReactions";

// `ui` 계층(MS-UI42 ~ UI44): 끝단 세 가지(사용자 승인 2026-11-25) — 단어 스티커도 글 상자처럼 끄는 동안만 transform · 손을 떼면 글자
// 크기로 확정, 오른쪽 도구 열 앞에서 멈춤, 돌린 상자의 외접 사각형으로 크기 제한, 보기도 같은 그리기 함수.

afterEach(() => {
  cleanup();
  clearBackHandlers();
});

const CANVAS = { width: 390, height: 700 };

function mount() {
  render(
    <MyStoryEditor
      caps={editorCapsOf(["text"])}
      choices={() => ({ words: [wordChoice("w1", "김치찌개", "kimchi stew")] })}
      sharing={{
        busy: false,
        checking: false,
        error: null,
        crisis: null,
        rejected: null,
        share: vi.fn(async () => undefined),
        requestReview: vi.fn(async () => undefined),
        reset: vi.fn(),
      }}
      onShare={vi.fn()}
      onChange={vi.fn()}
      onClose={vi.fn()}
    />,
  );
  const canvas = screen.getByTestId(ids.stickers);
  const EventConstructor = canvas.ownerDocument.defaultView?.CustomEvent;
  if (EventConstructor === undefined) throw new Error("CustomEvent is unavailable");
  act(() => {
    fireEvent(canvas, new EventConstructor("bindEvent:layoutchange", { detail: CANVAS }));
  });
}

type Touch = { pageX: number; pageY: number };
function gesture(el: () => Element, from: Touch[], to: Touch[]) {
  act(() => {
    fireEvent.touchstart(el(), { touches: from });
    fireEvent.touchmove(el(), { touches: to });
  });
}
const release = (el: () => Element) =>
  act(() => {
    fireEvent.touchend(el(), { touches: [] });
  });
const styleOf = (el: Element) => el.getAttribute("style") ?? "";
const percent = (style: string, key: string) =>
  Number(new RegExp(`${key}: ([0-9.]+)%`).exec(style)?.[1] ?? Number.NaN) / 100;

test("MS-UI42. 단어 스티커 — 크게 하면 회전한 상자가 도구 열 앞에서 멈추고(끄는 중 transform), 손을 떼면 글자 크기로 확정 · 끌면 가운데가 화면 끝까지", () => {
  mount();
  tapId(ids.toolWords);
  tapId(ids.choice("w1"));
  const sticker = () => screen.getByTestId(ids.sticker("s1"));
  gesture(
    sticker,
    [
      { pageX: 0, pageY: 0 },
      { pageX: 100, pageY: 0 },
    ],
    [
      { pageX: 0, pageY: 0 },
      { pageX: 400, pageY: 0 },
    ],
  );
  // 「김치찌개」 · 「kimchi stew」 — 폭 120s + 4 · 높이 80s + 4, −4° 외접 폭 ≤ 390 − 36 − 36 − 64 → 1.96 (끄는 중엔 확정 1의 상자 124 × 84를 키운 크기로 잼)
  expect(styleOf(sticker())).toContain("rotate(-4deg) scale(1.96)");
  expect(styleOf(sticker().querySelector("text") as Element)).toContain("font-size: 22px");
  release(sticker);
  expect(styleOf(sticker())).toContain("scale(1)");
  expect(styleOf(sticker())).toContain("padding: 15.68px 31.36px");
  const [ko, roman, meaning] = [...sticker().querySelectorAll("text")].map(styleOf);
  expect(ko).toContain("font-size: 43.12px");
  expect(roman).toContain("font-size: 21.56px");
  expect(meaning).toContain("font-size: 23.52px");
  // 오른쪽 끝으로 끌기 — 가운데가 화면 끝까지(도구 열 위로도, 2026-11-27 인스타그램 감각), 위로 끌면 위 끝까지
  gesture(sticker, [{ pageX: 0, pageY: 0 }], [{ pageX: 1000, pageY: -1000 }]);
  release(sticker);
  expect(percent(styleOf(sticker()), "left")).toBe(1);
  expect(percent(styleOf(sticker()), "top")).toBe(0);
  gesture(sticker, [{ pageX: 0, pageY: 0 }], [{ pageX: -1000, pageY: 1000 }]);
  release(sticker);
  expect(percent(styleOf(sticker()), "left")).toBe(0);
  expect(percent(styleOf(sticker()), "top")).toBe(1);
  expect(screen.getByTestId(ids.stickerRemove("s1"))).not.toBeNull();
});

test("MS-UI43. 글 상자 회전 — 두 손가락으로 90° 돌리며 키우면 세운 상자의 높이가 바탕 안에서 멈추고, 놓으면 그 크기로 확정", async () => {
  mount();
  tapId(ids.toolText);
  act(() => nativeInput("input", "오늘 처음 김치찌개 만들었어", ids.textInput));
  tapId(ids.textDone);
  const box = () => screen.getByTestId(ids.textBlock);
  gesture(
    box,
    [
      { pageX: 0, pageY: 0 },
      { pageX: 100, pageY: 0 },
    ],
    [
      { pageX: 0, pageY: 0 },
      { pageX: 0, pageY: 300 },
    ],
  );
  // 확정 1의 상자(221.2 × 76)를 키운 크기 → 세우면 높이 221.2s ≤ 700 − 72 → 2.839
  expect(styleOf(box())).toContain("rotate(90deg) scale(2.839)");
  release(box);
  expect(styleOf(box())).toContain("rotate(90deg) scale(1)");
  const [first] = [...box().querySelectorAll("text")].map(styleOf);
  expect(first).toContain("font-size: 62.458px");
});

test("MS-UI44. 보기 — 올린 단어 스티커를 편집과 같은 그리기 함수로(글자 크기 × scale, transform은 회전만, 로마자 · 뜻)", () => {
  render(
    <MyTextStoryCard
      story={myStory("ms-1", {
        kind: "text",
        background: "green",
        overlays: [
          {
            kind: "word",
            ko: "찌개",
            roman: "jjigae",
            meaning: "stew",
            word: { episodeId: "u01", ref: "voca:w2" },
            x: 0.4,
            y: 0.6,
            scale: 2,
            rotation: 10,
          },
        ],
      })}
    />,
  );
  const card = screen.getByTestId(ids.storyBackground);
  const sticker = card.querySelector(".my-story-sticker") as Element;
  expect(styleOf(sticker)).toContain("rotate(10deg) scale(1)");
  expect(styleOf(sticker)).toContain("left: 40%");
  expect(styleOf(sticker)).toContain("padding: 16px 32px");
  const lines = [...sticker.querySelectorAll("text")];
  expect(lines.map((el) => el.textContent)).toEqual(["찌개", "jjigae", "stew"]);
  expect(styleOf(lines[0] as Element)).toContain("font-size: 44px");
});
