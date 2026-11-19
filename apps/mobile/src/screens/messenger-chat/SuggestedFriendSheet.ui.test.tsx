import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { clearBackHandlers, systemBack, tapId } from "./chat-ui.test-support";
import { friendProfileTestIds as profileIds } from "./friend-profile.contract";
import { suggestedFriendsTestIds as ids } from "./suggested-friends.contract";
import type { SuggestedFriendSheetModel } from "./suggested-friends.contract";
import { SuggestedFriendSheet } from "./SuggestedFriendSheet";
import { friend, general } from "./suggested-friends.test-support";

// `ui` 계층(SS1 ~ SS4): 프로필 시트(R2 · R4 · R6). 추가 가능 = 소개 · 태그 · 첫 말 · Start chatting, 잠김 = 만날 회차 · 안내 줄 ·
// (제안이 있을 때만) Chat now + LIMITED. 가짜 카운트다운 없음. 아래 여백은 시스템 바 몫(ADR-0044).

const NOW = 1_800_000_000_000;

function setGlobalProps(value: unknown): void {
  (lynx as unknown as { __globalProps: unknown }).__globalProps = value;
}

afterEach(() => {
  cleanup();
  clearBackHandlers();
  setGlobalProps(undefined);
});

const doyun = friend("doyun", {
  name: "한도윤",
  unlockEpisode: 12,
  intro: { en: "Met at Cafe Kkeullim", ja: "カフェ" },
  tags: [{ en: "Coffee" }, { en: "Polite" }],
  sheetOpening: {
    ko: "안녕하세요! 카페 끌림 도윤이에요.",
    en: "Hi! It's Doyun from Cafe Kkeullim.",
  },
});

function mount(model: SuggestedFriendSheetModel) {
  const handlers = { onStart: vi.fn(), onEarly: vi.fn(), onClose: vi.fn() };
  render(<SuggestedFriendSheet model={model} now={NOW} {...handlers} />);
  return handlers;
}

const addable = (character = doyun): SuggestedFriendSheetModel => ({
  character,
  avatarUrl: "https://img/doyun.webp",
  status: "addable",
  offer: null,
});

test("SS1. 추가 가능: 이름 · 소개 · 태그 · 첫 말(ko · en) · Start chatting · Not now", () => {
  const { onStart, onClose } = mount(addable());
  expect(screen.getByTestId(ids.sheetName).textContent).toBe("한도윤");
  expect(screen.getByTestId(ids.sheetIntro).textContent).toBe("Met at Cafe Kkeullim");
  expect(screen.getByTestId(ids.sheetTags).textContent).toBe("CoffeePolite");
  const opening = screen.getByTestId(ids.sheetOpening).textContent ?? "";
  expect(opening).toContain("안녕하세요! 카페 끌림 도윤이에요.");
  expect(opening).toContain("Hi! It's Doyun from Cafe Kkeullim.");
  expect(screen.queryByTestId(ids.sheetInfo)).toBeNull();
  expect(screen.queryByTestId(ids.sheetEarly)).toBeNull();
  tapId(ids.sheetStart);
  expect(onStart).toHaveBeenCalledTimes(1);
  tapId(ids.sheetLater);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("SS1. 일반 인물(R6)은 이름 옆 NEW, 시스템 뒤로가기는 Not now와 같다", () => {
  const { onClose } = mount(addable(general("g1", { name: "하나" })));
  expect(screen.getByTestId(ids.sheet).textContent).toContain("NEW");
  expect(systemBack()).toBe(true);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("SS2. 잠김(제안 없음): 만날 회차 · 안내 줄 · Chat now 없음 · Start chatting 없음", () => {
  mount({ character: doyun, avatarUrl: null, status: "locked", offer: null });
  expect(screen.getByTestId(ids.sheetIntro).textContent).toBe("You'll meet in Episode 12");
  expect(screen.getByTestId(ids.sheetInfo).textContent).toBe(
    "Finish the story to swap numbers — 한도윤 texts first.",
  );
  expect(screen.queryByTestId(ids.sheetEarly)).toBeNull();
  expect(screen.queryByTestId(ids.sheetStart)).toBeNull();
  expect(screen.queryByTestId(ids.sheetOpening)).toBeNull();
  expect(screen.getByTestId(ids.sheetLater)).toBeInTheDocument();
});

test("SS3. 잠김 + 제안(끝 시각 없음): Chat now · 100, LIMITED만, 둘째 줄, 탭 → onEarly", () => {
  const { onEarly } = mount({
    character: doyun,
    avatarUrl: null,
    status: "locked",
    offer: { price: 100, endsAt: null },
  });
  expect(screen.getByTestId(ids.sheetEarly).textContent).toContain("Chat now · 100");
  expect(screen.getByTestId(ids.sheetEarly).textContent).toContain(
    "Launch special · meet 한도윤 early",
  );
  expect(screen.getByTestId(ids.sheetLimited).textContent).toBe("LIMITED");
  // 값의 단위 · 한정 여부도 낭독된다.
  expect(screen.getByTestId(ids.sheetEarly).getAttribute("accessibility-label")).toBe(
    "Chat now for 100 coins, limited offer",
  );
  tapId(ids.sheetEarly);
  expect(onEarly).toHaveBeenCalledTimes(1);
});

test("SS3. 끝 시각이 있으면 남은 시간을 보인다", () => {
  mount({
    character: doyun,
    avatarUrl: null,
    status: "locked",
    offer: { price: 100, endsAt: NOW + (2 * 24 + 14) * 3_600_000 },
  });
  expect(screen.getByTestId(ids.sheetLimited).textContent).toBe("LIMITED · 2d 14h");
});

test("SS4. 단추 줄 아래 여백 = 16 + 아래 시스템 바(Android 3버튼 48)", () => {
  setGlobalProps({
    safeAreaInsets: { top: 48, bottom: 48, left: 0, right: 0 },
    tappableBottomInset: 48,
  });
  mount(addable());
  const actions = screen.getByTestId(ids.sheetLater).parentElement;
  expect(actions?.getAttribute("style") ?? "").toMatch(/padding-bottom:\s*64px/);
});

// ⟨ADR-0162 2026-11-19⟩ 사실 줄 · AI 표시 · 목소리 견본 · 읽기 전용 프로필(SS5 ~ SS8).
const seoyeon = general("seoyeon", {
  name: "차서연",
  intro: { en: "I do tattoos in Seongsu." },
  profile: {
    age: 28,
    job: { en: "Tattoo artist & illustrator" },
    mbti: "ENTP",
    voiceSamplePath: "content/audio/companion/seoyeon-intro.mp3",
  },
});

test("SS5. 사실 줄(나이 · 직업 · MBTI)과 AI 표시 — 잠김이면 사실 줄이 없다", () => {
  mount(addable(seoyeon));
  expect(screen.getByTestId(profileIds.facts).textContent).toBe(
    "Age 28 · Tattoo artist & illustrator · ENTP",
  );
  expect(screen.getByTestId(profileIds.ai).textContent).toBe(
    "차서연 is an AI character. Replies are written by AI.",
  );
  cleanup();
  mount({ character: doyun, avatarUrl: null, status: "locked", offer: null });
  expect(screen.queryByTestId(profileIds.facts)).toBeNull();
});

test("SS6. 견본 단추는 주소가 있을 때만, 저절로 틀지 않고, 재생 모듈이 없으면 조용한 「unavailable」 줄", () => {
  mount(addable(seoyeon));
  expect(screen.queryByTestId(profileIds.voice)).toBeNull();
  cleanup();
  const onVoicePlayed = vi.fn<() => void>();
  render(
    <SuggestedFriendSheet
      model={{ ...addable(seoyeon), voiceUrl: "https://cdn/seoyeon-intro.mp3" }}
      now={NOW}
      onStart={vi.fn<() => void>()}
      onEarly={vi.fn<() => void>()}
      onClose={vi.fn<() => void>()}
      onVoicePlayed={onVoicePlayed}
    />,
  );
  const voice = screen.getByTestId(profileIds.voice);
  expect(voice.getAttribute("data-playback")).toBe("idle");
  expect(voice.getAttribute("accessibility-label")).toBe("Hear 차서연's voice");
  tapId(profileIds.voice);
  // ui 환경에는 `NativeModules`가 없어 재생이 「unavailable」로 끝난다.
  expect(screen.getByTestId(profileIds.voice).getAttribute("data-playback")).toBe("error");
  expect(screen.getByTestId(profileIds.voiceNote).textContent).toBe("Voice sample unavailable");
  expect(onVoicePlayed).not.toHaveBeenCalled();
});

test("SS7. 읽기 전용 프로필(방 머리): 첫 말 · Start chatting · Not now가 없고 Close만 — 사실 줄 · 소개 · 견본은 있다", () => {
  const onClose = vi.fn<() => void>();
  render(
    <SuggestedFriendSheet
      model={{ ...addable(seoyeon), mode: "profile", voiceUrl: "https://cdn/s.mp3" }}
      now={NOW}
      onStart={vi.fn<() => void>()}
      onEarly={vi.fn<() => void>()}
      onClose={onClose}
      ownBack={false}
    />,
  );
  expect(screen.queryByTestId(ids.sheetOpening)).toBeNull();
  expect(screen.queryByTestId(ids.sheetStart)).toBeNull();
  expect(screen.queryByTestId(ids.sheetLater)).toBeNull();
  expect(screen.getByTestId(ids.sheetIntro).textContent).toBe("I do tattoos in Seongsu.");
  expect(screen.getByTestId(profileIds.facts)).toBeInTheDocument();
  expect(screen.getByTestId(profileIds.voice)).toBeInTheDocument();
  tapId(profileIds.close);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("SS8. 방에서 연 시트는 시스템 뒤로가기를 등록하지 않는다(방이 단 하나의 주인)", () => {
  const onClose = vi.fn<() => void>();
  render(
    <SuggestedFriendSheet
      model={{ ...addable(seoyeon), mode: "profile" }}
      now={NOW}
      onStart={vi.fn<() => void>()}
      onEarly={vi.fn<() => void>()}
      onClose={onClose}
      ownBack={false}
    />,
  );
  expect(systemBack()).toBe(false);
  expect(onClose).not.toHaveBeenCalled();
});
