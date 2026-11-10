import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { fireOnRef } from "./chat-ui.test-support";
import { newFriendTestIds as ids, type NewFriendModel } from "./new-friend.contract";
import { newFriendTimelineOf } from "./new-friend";
import { NewFriendSheet } from "./NewFriendSheet";

// `ui` 계층(MC2-UI14): 새 친구 시트(E2) 그리기 — 입력 중 / 첫 메시지 두 단계, Reply 흐림 · 켜짐, 띠 · 칩 · 얼굴 · 이름 · 만난 곳,
// Later · 끌어내림, dialog 역할 · 이름, 움직임 줄이기. 단계 전이 · 시간표는 unit(new-friend)이 지고 층(타이머)은 UI15가 진다.
// 가정(구현자가 따를 것): 끌어내림은 판(`panel`)의 bindtouchstart · bindtouchend detail.y를 ui-lynx
// shouldDismissBottomSheetDrag(48)로 판정한다. 얼굴의 data-motion = timeline.face("bounce" | "still"),
// 점의 정지는 `typing` 안 클래스 `chat-typing-still`.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const MODEL: NewFriendModel = {
  characterId: "mina",
  roomId: "mina",
  name: "미나",
  faceUrl: "https://cdn/content/images/profiles/mina-casual.webp",
  sceneUrl: "https://cdn/content/images/u03-mina/pre-1.webp",
  episodeOrdinal: 3,
  episodeTitle: "Ikseon guesthouse",
  opening: { ko: "안녕! 나 미나야. 오늘 뭐 했어?", en: "Hi! It's Mina. What did you do today?" },
};

function mount(
  phase: "typing" | "message",
  over: { model?: NewFriendModel; motion?: "standard" | "reduced" } = {},
) {
  const handlers = { onReply: vi.fn<() => void>(), onLater: vi.fn<() => void>() };
  render(
    <NewFriendSheet
      model={over.model ?? MODEL}
      phase={phase}
      timeline={newFriendTimelineOf(over.motion ?? "standard")}
      {...handlers}
    />,
  );
  return handlers;
}

const byId = (testId: string): HTMLElement => screen.getByTestId(testId);
const tap = (testId: string): void => {
  const el = byId(testId);
  fireEvent.tap(el.querySelector('[data-testid="ui-lynx-button"]') ?? el, {});
};
const attrOf = (testId: string, name: string): string | null => {
  const el = byId(testId);
  return el.hasAttribute(name)
    ? el.getAttribute(name)
    : (el.querySelector(`[${name}]`)?.getAttribute(name) ?? null);
};
/** 판에 한 번 끌었다 놓습니다(시작 y → 끝 y). ui-lynx BottomSheet와 같이 `bindtouchstart` · `bindtouchend`의 detail.y를 읽는다고 본다. */
function drag(startY: number, endY: number): void {
  fireOnRef(ids.panel, "touchstart", { y: startY });
  fireOnRef(ids.panel, "touchend", { y: endY });
}

test("MC2-UI14. typing: 시트 단계가 typing이고 점과 「미나 is typing…」이 보이며 첫 메시지는 아직 없다", () => {
  mount("typing");

  expect(byId(ids.sheet).getAttribute("data-phase")).toBe("typing");
  expect(byId(ids.typing).textContent).toContain("미나 is typing…");
  expect(screen.queryByTestId(ids.message)).toBeNull();
});

test("MC2-UI14. typing: Reply는 흐림(dim)이지만 눌리면 onReply가 불린다", () => {
  const { onReply } = mount("typing");

  expect(byId(ids.reply).getAttribute("data-state")).toBe("dim");
  tap(ids.reply);

  expect(onReply).toHaveBeenCalledTimes(1);
});

test("MC2-UI14. message: 같은 자리에 한국어 · 영어 말풍선이 서고 입력 중 표시는 사라지며 Reply가 켜진다(lit)", () => {
  mount("message");

  expect(byId(ids.sheet).getAttribute("data-phase")).toBe("message");
  const message = byId(ids.message);
  expect(message.textContent).toContain(MODEL.opening.ko);
  expect(message.textContent).toContain(MODEL.opening.en);
  expect(screen.queryByTestId(ids.typing)).toBeNull();
  expect(byId(ids.reply).getAttribute("data-state")).toBe("lit");
});

test("MC2-UI14. message: Reply 탭 → onReply 한 번", () => {
  const { onReply, onLater } = mount("message");

  tap(ids.reply);

  expect(onReply).toHaveBeenCalledTimes(1);
  expect(onLater).not.toHaveBeenCalled();
});

test("MC2-UI14. 띠 그림은 장면 주소이고 칩은 「Episode 3」이다", () => {
  mount("message");

  const image = byId(ids.band).querySelector("image");
  expect(image?.getAttribute("src")).toBe(MODEL.sceneUrl);
  expect(byId(ids.chip).textContent?.trim()).toBe("Episode 3");
});

test("MC2-UI14. NEW FRIEND · 이름 · 만난 곳이 서고 얼굴 그림은 faceUrl이다", () => {
  mount("message");

  expect(screen.getByTestId(ids.sheet).textContent).toContain("NEW FRIEND");
  expect(byId(ids.name).textContent?.trim()).toBe("미나");
  expect(byId(ids.met).textContent?.trim()).toBe("Met in Episode 3 · Ikseon guesthouse");
  expect(byId(ids.face).querySelector("image")?.getAttribute("src")).toBe(MODEL.faceUrl);
});

test("MC2-UI14. faceUrl이 없으면 얼굴 자리에 이름 이니셜이 선다(그림 없음)", () => {
  mount("message", { model: { ...MODEL, faceUrl: null } });

  const face = byId(ids.face);
  expect(face.querySelector("image")).toBeNull();
  expect(face.textContent).toContain("미");
});

test("MC2-UI14. sceneUrl이 없어도 시트는 서고 띠에 그림이 없다", () => {
  mount("message", { model: { ...MODEL, sceneUrl: null } });

  expect(byId(ids.sheet)).toBeTruthy();
  expect(byId(ids.band).querySelector("image")).toBeNull();
});

test("MC2-UI14. Later 탭 → onLater 한 번(onReply 아님)", () => {
  const { onReply, onLater } = mount("message");

  tap(ids.later);

  expect(onLater).toHaveBeenCalledTimes(1);
  expect(onReply).not.toHaveBeenCalled();
});

test("MC2-UI14. scrim 탭도 Later로 닫는다", () => {
  const { onLater } = mount("message");

  fireEvent.tap(screen.getByTestId("ui-lynx-overlay"), {});

  expect(onLater).toHaveBeenCalledTimes(1);
});

test("MC2-UI14. 판을 아래로 60 끌어놓으면 onLater, 20만 끌면 무동작이다(48 경계)", () => {
  const { onLater } = mount("message");

  drag(100, 120);
  expect(onLater).not.toHaveBeenCalled();
  drag(100, 160);

  expect(onLater).toHaveBeenCalledTimes(1);
});

test("MC2-UI14. 낭독: 판은 dialog 역할이고 이름은 「New friend: 미나」다", () => {
  mount("typing");

  expect(attrOf(ids.panel, "accessibility-role-description")).toBe("dialog");
  expect(attrOf(ids.panel, "accessibility-label")).toBe("New friend: 미나");
});

test("MC2-UI14. 움직임 줄이기: 얼굴은 정지(still)이고 입력 중 점도 정지 클래스다", () => {
  mount("typing", { motion: "reduced" });

  expect(byId(ids.face).getAttribute("data-motion")).toBe("still");
  const typing = byId(ids.typing);
  const still =
    typing.className.includes("chat-typing-still") ||
    typing.querySelector(".chat-typing-still") !== null;
  expect(still).toBe(true);
});

test("MC2-UI14. 기본 움직임: 얼굴은 bounce이고 점은 정지 클래스가 아니다", () => {
  mount("typing");

  expect(byId(ids.face).getAttribute("data-motion")).toBe("bounce");
  const typing = byId(ids.typing);
  expect(typing.className.includes("chat-typing-still")).toBe(false);
  expect(typing.querySelector(".chat-typing-still")).toBeNull();
});

// ------------------------------------------------------------------ 접근성 C1 · M5

const measure = (top: number, content: number, actions: number): void => {
  fireOnRef(ids.top, "layoutchange", { height: top });
  fireOnRef(ids.scrollContent, "layoutchange", { height: content });
  fireOnRef(ids.actions, "layoutchange", { height: actions });
};

test("C1. 판 높이에 px 상한이 있다(화면 667 − 상태 바 0 − 24) — 퍼센트가 아니다", () => {
  vi.stubGlobal("SystemInfo", { pixelHeight: 1334, pixelRatio: 2 });
  mount("message");

  expect(byId(ids.panel).style.maxHeight).toBe("643px");
});

test("C1. 본문(NEW FRIEND · 이름 · 만난 곳 · 말풍선)은 scroll-view 안이고 Reply · Later와 띠 · 얼굴은 밖이다", () => {
  vi.stubGlobal("SystemInfo", { pixelHeight: 1334, pixelRatio: 2 });
  mount("message");

  const scroll = byId(ids.scroll);
  expect(scroll.tagName.toLowerCase()).toBe("scroll-view");
  expect(scroll.contains(byId(ids.name))).toBe(true);
  expect(scroll.contains(byId(ids.met))).toBe(true);
  expect(scroll.contains(byId(ids.message))).toBe(true);
  expect(scroll.contains(byId(ids.reply))).toBe(false);
  expect(scroll.contains(byId(ids.later))).toBe(false);
  expect(scroll.contains(byId(ids.band))).toBe(false);
  expect(scroll.contains(byId(ids.face))).toBe(false);
});

test("C1. 재기 전에는 스크롤 칸 높이를 강제하지 않는다", () => {
  vi.stubGlobal("SystemInfo", { pixelHeight: 1334, pixelRatio: 2 });
  mount("message");

  expect(byId(ids.scroll).style.height).toBe("");
});

test("C1. 큰 글자로 내용이 넘치면 스크롤 칸은 남는 높이(상한 − 고정부)로 자르고, 들어가면 내용 높이를 쓴다", () => {
  vi.stubGlobal("SystemInfo", { pixelHeight: 1334, pixelRatio: 2 });
  mount("message");

  measure(216, 700, 120);
  expect(byId(ids.scroll).style.height).toBe("307px");

  measure(216, 200, 120);
  expect(byId(ids.scroll).style.height).toBe("200px");
});

test("M5. 「NEW FRIEND」 + 이름이 접근성 요소 하나(header, 라벨 「New friend: 미나」)로 묶이고 안쪽 글은 낭독에서 숨는다", () => {
  mount("typing");

  const title = byId(ids.title);
  expect(title.id).toBe(ids.title);
  expect(title.getAttribute("accessibility-element")).toBe("true");
  expect(title.getAttribute("accessibility-traits")).toBe("header");
  expect(title.getAttribute("accessibility-label")).toBe("New friend: 미나");
  expect(title.getAttribute("accessibility-role-description")).toBe("dialog");
  expect(title.contains(byId(ids.name))).toBe(true);
  expect(byId(ids.name).getAttribute("accessibility-elements-hidden")).toBe("true");
  // 판 감싸개에는 접근성 요소가 아니라 효과 없는 라벨 · 역할을 두지 않는다.
  expect(byId(ids.panel).hasAttribute("accessibility-label")).toBe(false);
  expect(byId(ids.panel).hasAttribute("accessibility-role-description")).toBe(false);
});
