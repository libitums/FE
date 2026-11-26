import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import * as audio from "../../lib/audio";
import type { ChoiceRomanization } from "../../lib/session-options";
import { ChatEventsContext } from "./chat-events";
import { clearBackHandlers, tapId } from "./chat-ui.test-support";
import { VOICE_TAP_GUARD_MS } from "./profile-voice-sample";
import { suggestedFriendsTestIds as ids } from "./suggested-friends.contract";
import type { SuggestedFriendSheetModel } from "./suggested-friends.contract";
import { SuggestedFriendSheet } from "./SuggestedFriendSheet";
import { general } from "./suggested-friends.test-support";

// `ui` 계층(PV-UI1 ~ PV-UI6, ADR-0198 D2 · D4): 프로필 시트 목소리 견본 — 단추(Hear voice ↔ Pause · Resume, 저절로 틀지 않음,
// 연타 막기, 닫히면 멈춤, 못 읽으면 조용한 한 줄), 첫 말 칸 = 견본 대본(로마자는 스위치), 잠김이면 단추 · 대본 없음, 이벤트는 새로 틀 때만.

vi.mock("../../lib/audio", async (importOriginal) => ({
  ...(await importOriginal<typeof audio>()),
  playAudio: vi.fn(() => "started" as const),
  stopAudio: vi.fn(),
  pauseAudio: vi.fn(),
  resumeAudio: vi.fn(),
}));

const NOW = 1_800_000_000_000;
const URL = "https://cdn/content/audio/companion/seoyeon-intro.mp3";
let clock = NOW;
const later = () => {
  clock += VOICE_TAP_GUARD_MS;
};

const seoyeon = general("seoyeon", {
  name: "차서연",
  sheetOpening: { ko: "안녕하세요, 차서연이에요.", en: "Hi, I'm Cha Seoyeon." },
  voiceSamplePath: "content/audio/companion/seoyeon-intro.mp3",
  voiceSampleScript: {
    ko: "차서연이에요. 제 그림 보고 싶어요? 비싸요 ㅋㅋ",
    roman: "chaseoyeonieyo. je geurim bogo sipeoyo? bissayo kk",
    en: "I'm Cha Seoyeon. Want to see my drawings? They're pricey. lol",
  },
});

const model = (status: "addable" | "locked" = "addable"): SuggestedFriendSheetModel => ({
  character: seoyeon,
  avatarUrl: null,
  status,
  offer: null,
});

const sink = vi.fn();

function mount(
  options: {
    readonly status?: "addable" | "locked";
    readonly url?: string | null;
    readonly romanization?: ChoiceRomanization;
  } = {},
) {
  return render(
    <ChatEventsContext.Provider value={{ sink, roomId: null }}>
      <SuggestedFriendSheet
        model={model(options.status)}
        now={NOW}
        voiceSampleUrl={options.url === undefined ? URL : options.url}
        {...(options.romanization === undefined ? {} : { romanization: options.romanization })}
        onStart={vi.fn()}
        onEarly={vi.fn()}
        onClose={vi.fn()}
      />
    </ChatEventsContext.Provider>,
  );
}

const voiceText = () => screen.getByTestId(ids.sheetVoice).textContent ?? "";
const voiceLabel = () => screen.getByTestId(ids.sheetVoice).getAttribute("accessibility-label");
const played = () =>
  sink.mock.calls.map((call) => call[0]).filter((e) => e.name === "friend_voice_sample_played");

beforeEach(() => {
  clock = NOW;
  vi.spyOn(Date, "now").mockImplementation(() => clock);
  vi.mocked(audio.playAudio)
    .mockClear()
    .mockImplementation(() => "started");
  vi.mocked(audio.stopAudio).mockClear();
  vi.mocked(audio.pauseAudio).mockClear();
  vi.mocked(audio.resumeAudio).mockClear();
  sink.mockClear();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.restoreAllMocks();
});

test("PV-UI1. 단추는 본문 첫 줄 Hear voice(낭독 이름에 인물), 저절로 틀지 않고, 첫 말 칸은 견본 대본", () => {
  mount();
  expect(voiceText()).toBe("Hear voice");
  expect(voiceLabel()).toBe("Hear 차서연's voice");
  expect(audio.playAudio).not.toHaveBeenCalled();
  const opening = screen.getByTestId(ids.sheetOpening).textContent ?? "";
  expect(opening).toContain("차서연이에요. 제 그림 보고 싶어요? 비싸요 ㅋㅋ");
  expect(opening).toContain("I'm Cha Seoyeon. Want to see my drawings? They're pricey. lol");
  expect(opening).not.toContain("안녕하세요, 차서연이에요.");
  expect(opening).not.toContain("chaseoyeonieyo");
  expect(screen.queryByTestId(ids.sheetVoiceUnavailable)).toBeNull();
});

test("PV-UI2. 누름 → 재생(Pause) · 연타는 버림 · 일시정지(Resume) · 이어 듣기 · 끝나면 Hear voice, 이벤트는 처음 틀 때 한 번", () => {
  mount();
  tapId(ids.sheetVoice);
  expect(audio.playAudio).toHaveBeenCalledTimes(1);
  expect(vi.mocked(audio.playAudio).mock.calls[0]?.[0]).toBe(URL);
  expect(voiceText()).toBe("Pause");
  expect(voiceLabel()).toBe("Pause 차서연's voice");
  expect(played()).toEqual([
    expect.objectContaining({ name: "friend_voice_sample_played", characterId: "seoyeon" }),
  ]);

  tapId(ids.sheetVoice); // 같은 순간의 둘째 누름(이중 탭)
  expect(audio.pauseAudio).not.toHaveBeenCalled();
  expect(voiceText()).toBe("Pause");

  later();
  tapId(ids.sheetVoice);
  expect(audio.pauseAudio).toHaveBeenCalledTimes(1);
  expect(voiceText()).toBe("Resume");

  later();
  tapId(ids.sheetVoice);
  expect(audio.resumeAudio).toHaveBeenCalledTimes(1);
  expect(voiceText()).toBe("Pause");

  const finished = vi.mocked(audio.playAudio).mock.calls[0]?.[1];
  act(() => finished?.());
  expect(voiceText()).toBe("Hear voice");

  later();
  tapId(ids.sheetVoice);
  expect(audio.playAudio).toHaveBeenCalledTimes(2);
  expect(played()).toHaveLength(1);
});

test("PV-UI3. 시트가 닫히면(재생 중 · 멈춰 둠) 멈춘다 — 틀지 않았으면 멈추지 않는다", () => {
  const idle = mount();
  idle.unmount();
  expect(audio.stopAudio).not.toHaveBeenCalled();

  const playing = mount();
  tapId(ids.sheetVoice);
  later();
  tapId(ids.sheetVoice); // 멈춰 둠
  playing.unmount();
  expect(audio.stopAudio).toHaveBeenCalledTimes(1);
});

test("PV-UI4. 못 읽으면 단추는 Hear voice, 단추 아래 조용한 한 줄 · 이벤트 없음 — 주소가 없어도 같다", () => {
  vi.mocked(audio.playAudio).mockImplementation(() => "unavailable");
  mount();
  tapId(ids.sheetVoice);
  expect(voiceText()).toBe("Hear voice");
  expect(screen.getByTestId(ids.sheetVoiceUnavailable).textContent).toBe(
    "Voice sample unavailable",
  );
  expect(played()).toEqual([]);
  cleanup();

  vi.mocked(audio.playAudio).mockClear();
  mount({ url: null });
  tapId(ids.sheetVoice);
  expect(audio.playAudio).not.toHaveBeenCalled();
  expect(screen.getByTestId(ids.sheetVoiceUnavailable).textContent).toBe(
    "Voice sample unavailable",
  );
});

test("PV-UI5. 로마자 스위치 켬 — 대본 아래 정본 로마자 · 뜻, 끔 — 뜻 한 줄", () => {
  mount({ romanization: "shown" });
  const shown = screen.getByTestId(ids.sheetOpening).textContent ?? "";
  expect(shown).toContain("chaseoyeonieyo. je geurim bogo sipeoyo? bissayo kk");
  expect(shown).toContain("I'm Cha Seoyeon. Want to see my drawings? They're pricey. lol");
  cleanup();

  mount({ romanization: "hidden" });
  const hidden = screen.getByTestId(ids.sheetOpening).textContent ?? "";
  expect(hidden).not.toContain("chaseoyeonieyo");
  expect(hidden).toContain("I'm Cha Seoyeon. Want to see my drawings? They're pricey. lol");
});

// 첫 말 말풍선 줄 순서(ADR-0188 개정 D8) — [한국어 / 로마자] 묶음 → 구분선 → 뜻. 끔이면 한국어 → 구분선 → 뜻.
const bubbleLines = (): string[] => {
  const opening = screen.getByTestId(ids.sheetOpening);
  const lines = opening.querySelectorAll(
    "[data-testid='ui-lynx-chat-bubble-message'], .ui-lynx-chat-bubble-annotation-romanization, .ui-lynx-chat-bubble-annotation-divider, .ui-lynx-chat-bubble-annotation-meaning, .ui-lynx-chat-bubble-translation",
  );
  return Array.from(lines).map((line) =>
    line.getAttribute("data-testid") === "ui-lynx-chat-bubble-message" ? "ko" : line.className,
  );
};

test("PV-UI7. 로마자 켬 — 한국어 · 로마자 → 구분선 → 뜻, 끔 — 한국어 → 구분선 → 뜻(번역 줄 없음)", () => {
  mount({ romanization: "shown" });
  expect(bubbleLines()).toEqual([
    "ko",
    "ui-lynx-chat-bubble-annotation-romanization",
    "ui-lynx-chat-bubble-annotation-divider",
    "ui-lynx-chat-bubble-annotation-meaning",
  ]);
  cleanup();

  mount({ romanization: "hidden" });
  expect(bubbleLines()).toEqual([
    "ko",
    "ui-lynx-chat-bubble-annotation-divider",
    "ui-lynx-chat-bubble-annotation-meaning",
  ]);
});

test("PV-UI6. 잠긴 인물 — 단추 · 대본 없음", () => {
  mount({ status: "locked" });
  expect(screen.queryByTestId(ids.sheetVoice)).toBeNull();
  expect(screen.queryByTestId(ids.sheetOpening)).toBeNull();
  expect(screen.getByTestId(ids.sheet).textContent).not.toContain("비싸요");
});

test("PV-UI6. 견본이 없는 인물 — 단추 없음, 첫 말 칸은 지금처럼 첫 말", () => {
  render(
    <SuggestedFriendSheet
      model={{ ...model(), character: general("g1", { name: "하나" }) }}
      now={NOW}
      onStart={vi.fn()}
      onEarly={vi.fn()}
      onClose={vi.fn()}
    />,
  );
  expect(screen.queryByTestId(ids.sheetVoice)).toBeNull();
  expect(screen.getByTestId(ids.sheetOpening).textContent).toContain("안녕하세요");
});
