import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { legacyPassedSeed } from "./test-helpers/progress-seed";
import { renderSignedInApp, signedInBootSession } from "./test-helpers/signed-in-app";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { manifestTextOf } from "../lib/audio-manifest.test-support";
import { CONTENT_AUDIO_MANIFEST_KEY } from "../lib/episode-cache";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { LETTER_SOUND_SYLLABLES, letterAudioIdOf } from "../lib/letters/jamo";
import { COMPOSE_ECHO_DELAY_MS } from "../screens/letters/compose-quiz";
import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";

// `integration` 계층: 글자 소리(ADR-0173) — 기기에 받아 둔 음성 정보 파일(letters 항목) → 콘텐츠 로더 → 더보기 결선 →
// Letters 칸 · 합치기 퀴즈 → 재생 모듈. 경계 대역은 저장소 · 오디오 모듈 · env뿐입니다(주소는 실제 해석기가 만듭니다).
// ⟨2026-11-23⟩ 자모 칸은 앱 내장 녹음(`hangul-…`, 호스트 번들 이름)을 냅니다 — 정보 파일과 상관없이.
// ⟨2026-11-24⟩ 퀴즈 음절(가 · 너 · 도)도 앱 내장 녹음(`hangul-s-<로마자>`)입니다 — 버킷에 올라와 있어도 내장 녹음이 먼저입니다.

const bucketAudio = (id: string) =>
  `https://test.supabase.co/storage/v1/object/public/content/audio/${id}.m4a`;

/** 41개 letters 항목을 가진 음성 정보 파일(업로드 뒤 상태). */
const LETTERS_MANIFEST = manifestTextOf(
  Object.fromEntries(
    LETTER_SOUND_SYLLABLES.map((syllable) => [
      letterAudioIdOf(syllable),
      { duration_ms: 640, speech_end_ms: 560 },
    ]),
  ),
);

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function boot(manifest: string | null) {
  const store = new Map<string, string>();
  store.set(authSessionStorageKey, serializeAuthSession(signedInBootSession));
  store.set(learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue);
  if (manifest !== null) store.set(CONTENT_AUDIO_MANIFEST_KEY, manifest);
  const play = vi.fn<(source: string, done: (result: unknown) => void) => void>();
  const haptic = vi.fn<(kind: string) => void>();
  vi.stubGlobal("NativeModules", {
    AudioPlaybackModule: { play, stop: vi.fn<() => void>() },
    SoundEffectsModule: { play: vi.fn<(id: string) => void>(), stopRing: () => {}, haptic },
  });
  const events: EpisodeIntroEvent[] = [];
  await renderSignedInApp(
    <App progressSeed={legacyPassedSeed} episodeIntroEventSink={(event) => events.push(event)} />,
    {
      storageModule: {
        get: (key: string) => store.get(key) ?? null,
        set: (key: string, value: string) => void store.set(key, value),
        remove: (key: string) => void store.delete(key),
      },
    },
  );
  return { play, haptic, events };
}

const openLetters = () => {
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-more"), {});
  fireEvent.tap(screen.getByTestId("more-menu-row-letters"), { eventType: "catchEvent" });
};
const openCompose = () =>
  fireEvent.tap(within(screen.getByTestId("letters-practice")).getByTestId("ui-lynx-button"), {});
// 타일 순서: ㅏ ㄷ ㄱ ㅗ ㄴ ㅓ
const tileOf: Record<string, number> = { ㅏ: 0, ㄷ: 1, ㄱ: 2, ㅗ: 3, ㄴ: 4, ㅓ: 5 };
const pick = (letter: string) =>
  fireEvent.tap(screen.getByTestId(`compose-tile-${tileOf[letter]!}`), {});
const sources = (play: ReturnType<typeof vi.fn>) => play.mock.calls.map((call) => call[0]);
const cellEvents = (events: readonly EpisodeIntroEvent[]) =>
  events.filter((event) => event.name === "letters_cell_tapped");

test("LAI1. 자모 칸을 누르면 그 자모의 내장 녹음(ㄱ · ㅑ · ㄲ)을 재생하고 이벤트는 played", async () => {
  const { play, events } = await boot(LETTERS_MANIFEST);
  openLetters();
  fireEvent.tap(screen.getByTestId("letters-cell-0"), {});
  fireEvent.tap(screen.getByTestId("letters-cell-15"), {});
  fireEvent.tap(screen.getByTestId("letters-cell-24"), {});
  expect(sources(play)).toEqual(["hangul-c-g-sound", "hangul-v-ya", "hangul-c-kk-sound"]);
  expect(cellEvents(events)).toMatchObject([
    { letter: "ㄱ", audio: "played" },
    { letter: "ㅑ", audio: "played" },
    { letter: "ㄲ", audio: "played" },
  ]);
});

test("LAI5. 칸을 여러 번 눌러도 소리만 — 진동 모듈 호출 없음 · 누른 칸이 켜진 채 남지 않음(ADR-0169 D2 ⟨2026-11-21 개정⟩)", async () => {
  const { play, haptic, events } = await boot(LETTERS_MANIFEST);
  openLetters();
  for (const index of [0, 15, 24, 0])
    fireEvent.tap(screen.getByTestId(`letters-cell-${index}`), {});
  expect(sources(play)).toEqual([
    "hangul-c-g-sound",
    "hangul-v-ya",
    "hangul-c-kk-sound",
    "hangul-c-g-sound",
  ]);
  expect(haptic).not.toHaveBeenCalled();
  expect(cellEvents(events)).toHaveLength(4);
  for (const index of [0, 15, 24]) {
    const tapped = screen.getByTestId(`letters-cell-${index}`);
    expect(tapped).not.toHaveAttribute("data-selected");
    expect(tapped.getAttribute("class") ?? "").not.toContain("selected");
  }
});

test("LAI2. 버킷에 음절 소리가 올라와 있어도 — 합치기 퀴즈는 앱 내장 음절 녹음을 맞힌 뒤 효과음 틈 뒤 한 번, 틀리면 음절 소리 없음", async () => {
  const { play } = await boot(LETTERS_MANIFEST);
  openLetters();
  openCompose();
  expect(screen.getByTestId("compose-play")).toHaveAttribute("accessibility-traits", "button");
  vi.useFakeTimers();
  pick("ㄱ");
  pick("ㅓ");
  act(() => {
    vi.advanceTimersByTime(COMPOSE_ECHO_DELAY_MS * 2);
  });
  expect(play).not.toHaveBeenCalled();
  fireEvent.tap(screen.getByTestId("learning-shell-action"), {});
  pick("ㄱ");
  pick("ㅏ");
  expect(play).not.toHaveBeenCalled();
  act(() => {
    vi.advanceTimersByTime(COMPOSE_ECHO_DELAY_MS);
  });
  expect(sources(play)).toEqual(["hangul-s-ga"]);
  fireEvent.tap(screen.getByTestId("learning-shell-action"), {});
  pick("ㄴ");
  pick("ㅓ");
  act(() => {
    vi.advanceTimersByTime(COMPOSE_ECHO_DELAY_MS);
  });
  expect(sources(play)).toEqual(["hangul-s-ga", "hangul-s-neo"]);
  expect(sources(play)).not.toContain(bucketAudio("letters/ga"));
});

test("LAI3. 정보 파일에 letters가 없어도 — 칸은 내장 녹음, 퀴즈 ▶는 단추로 내장 음절 녹음을 내고 맞힌 뒤 한 번 더", async () => {
  const { play, events } = await boot(manifestTextOf());
  openLetters();
  fireEvent.tap(screen.getByTestId("letters-cell-0"), {});
  expect(cellEvents(events)).toMatchObject([{ letter: "ㄱ", audio: "played" }]);
  expect(sources(play)).toEqual(["hangul-c-g-sound"]);
  play.mockClear();
  openCompose();
  // 2026-11-24: 음절 녹음을 앱에 실어 ▶가 회색(#573)에서 다시 단추가 된다.
  expect(screen.getByTestId("compose-play")).toHaveAttribute("accessibility-traits", "button");
  expect(screen.getByTestId("compose-play")).toHaveAttribute("accessibility-label", "Play");
  fireEvent.tap(screen.getByTestId("compose-play"), {});
  expect(sources(play)).toEqual(["hangul-s-ga"]);
  vi.useFakeTimers();
  pick("ㄱ");
  pick("ㅏ");
  act(() => {
    vi.advanceTimersByTime(COMPOSE_ECHO_DELAY_MS * 3);
  });
  expect(sources(play)).toEqual(["hangul-s-ga", "hangul-s-ga"]);
  expect(screen.getByTestId("learning-shell-action")).toHaveAttribute(
    "accessibility-label",
    "Next",
  );
});

test("LAI6. 정보 파일이 아예 없어도(첫 실행 · 오프라인) 세 라운드의 ▶가 너 · 도까지 내장 녹음을 낸다", async () => {
  const { play } = await boot(null);
  openLetters();
  openCompose();
  for (const [consonant, vowel, clip] of [
    ["ㄱ", "ㅏ", "hangul-s-ga"],
    ["ㄴ", "ㅓ", "hangul-s-neo"],
    ["ㄷ", "ㅗ", "hangul-s-do"],
  ] as const) {
    play.mockClear();
    fireEvent.tap(screen.getByTestId("compose-play"), {});
    expect(sources(play), clip).toEqual([clip]);
    pick(consonant);
    pick(vowel);
    fireEvent.tap(screen.getByTestId("learning-shell-action"), {});
  }
});

test("LAI4. 정보 파일이 아예 없어도(첫 실행 · 오프라인) 자모 칸 소리는 난다", async () => {
  const { play, events } = await boot(null);
  openLetters();
  fireEvent.tap(screen.getByTestId("letters-cell-10"), {});
  expect(cellEvents(events)).toMatchObject([{ letter: "ㅋ", audio: "played" }]);
  expect(sources(play)).toEqual(["hangul-c-k-sound"]);
});
