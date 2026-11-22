import { afterEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { manifestTextOf } from "../lib/audio-manifest.test-support";
import { AUDIO_MANIFEST_PATH } from "../lib/audio-manifest";
import { contentPathOf } from "./test-helpers/content-requests";
import { LETTER_SOUND_SYLLABLES, letterAudioIdOf } from "../lib/letters/jamo";
import { lettersStorageKey } from "../lib/letters-recommend";
import { systemBackEventName } from "../lib/system-back";
import { resetPushWiringForTests } from "./push-wiring";
import { PUSH_PROMPT_DELAY_MS, pushPromptStorageKey } from "./push-prompt";
import { passLearnerSignup } from "./test-helpers/learner-signup";
import { catalogNodeTestId } from "./test-helpers/map-unit-testid";
import {
  advance,
  answer as answerWith,
  bootToOnboarding,
  completeOnboarding,
  jsonReply,
  learnerProfileRecord,
  noRecord,
  present,
  settle,
  stubHost,
  stubServer,
  tapButtonIn,
  tapSocial,
  type Host,
  type Server,
} from "./test-helpers/returning-login-harness";
import type { EntryEvent } from "../lib/entry-flow";

// `integration` 계층: 입장 선택(ADR-0176) — 두 길 · Skip · 뒤로 · 기록 0 · 알림 권한은 첫 스토리 뒤. 대역은 경계뿐입니다
// (`test-helpers/returning-login-harness` — 저장소 · 로그인 · 푸시 모듈 · fetch).

// 준비 완료의 비행기가 실제 내장 매니페스트의 튜토리얼 표지로 풀리는지 봅니다(고정본에는 `cover`가 없습니다).
vi.unmock("../lib/episode-bundled");
vi.unmock("../lib/bundled-content-images");

afterEach(() => {
  cleanup();
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

type Session = { readonly host: Host; readonly server: Server; readonly events: EntryEvent[] };

async function reachEntry(
  account: "google" | "guest" = "google",
  /** 버킷에 올라온 음성 정보 파일 — 없으면 404. */
  audioManifest: string | null = null,
): Promise<Session> {
  const server = stubServer({ progress: noRecord, profile: noRecord });
  if (audioManifest !== null) {
    const answer = globalThis.fetch;
    vi.stubGlobal("fetch", (url: string, init?: RequestInit) =>
      contentPathOf(url) === AUDIO_MANIFEST_PATH
        ? Promise.resolve({ status: 200, text: async () => audioManifest })
        : answer(url, init),
    );
  }
  const host = stubHost();
  const events = bootToOnboarding();
  completeOnboarding();
  if (account === "google") await tapSocial("google");
  else {
    tapButtonIn("login-screen-method-guest");
    await settle();
  }
  passLearnerSignup();
  tapButtonIn("language-select-screen-next");
  return { host, server, events };
}

async function relaunch(store: ReadonlyMap<string, string>): Promise<Session> {
  cleanup();
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  const server = stubServer({ progress: noRecord, profile: noRecord });
  const host = stubHost(Object.fromEntries(store));
  const events = bootToOnboarding();
  await settle();
  return { host, server, events };
}

const tiles = ["ㅏ", "ㄷ", "ㄱ", "ㅗ", "ㄴ", "ㅓ"];
const startBasics = () => fireEvent.tap(screen.getByTestId("journey-entry-screen-basics"), {});

function solveCompose(): void {
  for (const pair of ["ㄱㅏ", "ㄴㅓ", "ㄷㅗ"]) {
    for (const letter of pair)
      fireEvent.tap(screen.getByTestId(`compose-tile-${tiles.indexOf(letter)}`), {});
    tapButtonIn("entry-basics-next");
  }
}

async function jumpIn(): Promise<void> {
  tapButtonIn("journey-entry-screen-story");
  await settle();
}

async function walkBasics(): Promise<void> {
  startBasics();
  tapButtonIn("entry-basics-next");
  solveCompose();
  tapButtonIn("entry-basics-next");
  await settle();
}

async function openStory(): Promise<void> {
  fireEvent.tap(screen.getByTestId("first-unit-map-tooltip"), {});
  await settle();
  expect(present("episode-intro-screen")).toBe(true);
}

async function skipStory(): Promise<void> {
  tapButtonIn("episode-intro-screen-skip");
  tapButtonIn("ui-lynx-dialog-action-skip");
  await settle();
}

async function exitStory(): Promise<void> {
  fireEvent.tap(
    within(screen.getByTestId("episode-intro-screen-back")).getByTestId("ui-lynx-round-button"),
    {},
  );
  await settle();
}

async function finishStory(): Promise<void> {
  tapButtonIn("episode-intro-screen-next");
  for (let guard = 0; guard < 30 && present("catalog-cover-screen"); guard += 1) {
    const dialog = screen.queryByTestId("ui-lynx-visual-novel-dialog");
    if (dialog?.getAttribute("data-status") === "revealing")
      tapButtonIn("catalog-cover-screen-next");
    tapButtonIn("catalog-cover-screen-next");
  }
  expect(present("episode-banner-screen")).toBe(true);
  fireEvent.tap(screen.getByTestId("episode-banner-screen"), {});
  await settle();
}

async function pressBack(): Promise<void> {
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit(systemBackEventName, ["1"]);
  });
  await settle();
}

/** 첫 레슨을 열었다가 나옵니다 — Letters 추천의 신호(failed)가 남습니다. */
async function leaveFirstLesson(): Promise<void> {
  fireEvent.tap(screen.getByTestId(catalogNodeTestId("u00-tutorial", "S1")), {});
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
  await settle();
  for (let guard = 0; guard < 4 && !present("ui-lynx-dialog-action-leave"); guard += 1)
    await pressBack();
  tapButtonIn("ui-lynx-dialog-action-leave");
  await settle();
}

const waitPastPrompt = () => advance(PUSH_PROMPT_DELAY_MS * 3);
const onMapWithGuide = () => present("journey-map-screen") && present("first-unit-guide-map");
const names = (events: readonly EntryEvent[]) =>
  events.map((event) => {
    if (event.name === "entry_screen_viewed") return `viewed:${event.screen}`;
    if (event.name === "entry_path_selected") return `${event.name}:${event.path}`;
    if (event.name === "entry_basics_step_completed" || event.name === "entry_basics_skipped")
      return `${event.name}:${event.step}`;
    return event.name;
  });
const sinceEntry = (events: readonly EntryEvent[]) => {
  const all = names(events);
  return all.slice(all.indexOf("viewed:journey-entry") + 1);
};
const pending = (host: Host) => host.store.get(pushPromptStorageKey("user-1"));

describe("두 길", () => {
  test("EBI1. 바로 입장 → 기존 첫 유닛 가이드. 완주는 한 번", async () => {
    const { events } = await reachEntry();
    await jumpIn();

    expect(onMapWithGuide()).toBe(true);
    expect(present("episode-intro-screen")).toBe(false);
    expect(sinceEntry(events)).toEqual(["entry_path_selected:story", "entry_completed"]);
  });

  test("EBI1′. 그 가이드는 내장 매니페스트의 표지 그림까지 들고, 첫 구획 위에 구분선이 없고, 그림을 누르면 닫힌다", async () => {
    await reachEntry();
    await jumpIn();

    const lifted = screen.getByTestId("catalog-cover-illustrated-u00-tutorial");
    expect(lifted.classList.contains("catalog-cover-illustrated-guided")).toBe(true);
    expect(
      screen
        .getByTestId("catalog-section-u00-tutorial")
        .querySelectorAll(".episode-pending-divider").length,
    ).toBe(0);

    fireEvent.tap(lifted, {});
    await settle();

    expect(present("first-unit-guide-map")).toBe(false);
    expect(present("episode-intro-screen")).toBe(false);
  });

  test("EBI2. 기초부터 →글자 → 합치기 → 준비 완료 → 같은 가이드. 완주는 마지막에 한 번", async () => {
    const { events } = await reachEntry();

    startBasics();
    expect(present("entry-basics-letters")).toBe(true);
    expect(present("ui-lynx-bottom-navigator")).toBe(false);
    tapButtonIn("entry-basics-next");
    expect(present("entry-basics-compose")).toBe(true);
    solveCompose();
    expect(present("entry-basics-ready")).toBe(true);
    expect(present("ui-lynx-bottom-navigator")).toBe(false);
    expect(screen.getByTestId("entry-basics-plane").getAttribute("src")).toContain("u00-tutorial");
    expect(names(events)).not.toContain("entry_completed");
    tapButtonIn("entry-basics-next");
    await settle();

    expect(onMapWithGuide()).toBe(true);
    expect(present("ui-lynx-bottom-navigator")).toBe(true);
    expect(sinceEntry(events)).toEqual([
      "entry_path_selected:basics",
      "viewed:entry-basics-letters",
      "entry_basics_step_completed:letters",
      "viewed:entry-basics-compose",
      "entry_basics_step_completed:compose",
      "viewed:entry-basics-ready",
      "entry_basics_step_completed:ready",
      "entry_completed",
    ]);
  });

  test.each(["letters", "compose"] as const)(
    "EBI3. %s의 Skip도 같은 가이드로 간다",
    async (step) => {
      const { events } = await reachEntry();
      startBasics();
      if (step === "compose") tapButtonIn("entry-basics-next");

      tapButtonIn("entry-basics-skip");
      await settle();

      expect(onMapWithGuide()).toBe(true);
      expect(sinceEntry(events).slice(-2)).toEqual([
        `entry_basics_skipped:${step}`,
        "entry_completed",
      ]);
    },
  );

  test("EBI4. 시스템 뒤로는 준비 완료 → 합치기 → 글자 → 입장 한 칸씩이고 완주하지 않는다", async () => {
    const { events } = await reachEntry();
    startBasics();
    tapButtonIn("entry-basics-next");
    solveCompose();

    const back = async () => {
      act(() => {
        lynx.getJSModule("GlobalEventEmitter").emit(systemBackEventName, ["1"]);
      });
      await settle();
    };
    await back();
    expect(present("entry-basics-compose")).toBe(true);
    await back();
    expect(present("entry-basics-letters")).toBe(true);
    await back();
    expect(present("journey-entry-screen-title")).toBe(true);
    expect(names(events)).not.toContain("entry_completed");

    await jumpIn();
    expect(names(events).filter((name) => name === "entry_completed")).toHaveLength(1);
  });

  test("EBI5. 기초는 어디에도 세지 않는다 — 저장 · 서버 요청이 바로 입장과 같다", async () => {
    const direct = await reachEntry();
    await jumpIn();
    await waitPastPrompt();
    const directKeys = [...direct.host.store.keys()].sort();
    const directRpcs = [...direct.server.rpcs].sort();
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();

    const basics = await reachEntry();
    await walkBasics();
    await waitPastPrompt();

    expect([...basics.host.store.keys()].sort()).toEqual(directKeys);
    expect([...basics.server.rpcs].sort()).toEqual(directRpcs);
    expect(basics.host.store.has(lettersStorageKey)).toBe(false);
    expect(present("first-unit-guide-map")).toBe(true);
  });

  test("EBI6. 손님도 같은 두 길이고 알림은 묻지 않는다", async () => {
    const { host, server, events } = await reachEntry("guest");
    await walkBasics();

    expect(onMapWithGuide()).toBe(true);
    expect(names(events)).toContain("entry_completed");
    await openStory();
    await skipStory();
    await waitPastPrompt();
    expect(host.register).not.toHaveBeenCalled();
    expect([...host.store.keys()].some((key) => key.includes("push-prompt"))).toBe(false);
    expect(server.rpcs).toEqual([]);
  });
});

describe("글자 소리", () => {
  test("EBI7. 음성 정보 파일이 없으면 듣기를 약속하지 않는다", async () => {
    await reachEntry();
    startBasics();

    expect(screen.getByTestId("entry-basics-lead").textContent).not.toContain("Tap a letter");
    expect(screen.getByTestId("entry-basics-letter-0-speaker")).toHaveAttribute(
      "data-audio",
      "unavailable",
    );
  });

  test("EBI8. 파일이 올라온 뒤에는 코드 변경 없이 약속하고 들린다", async () => {
    const play = vi.fn<(source: string, done: (result: unknown) => void) => void>();
    const uploaded = manifestTextOf(
      Object.fromEntries(
        LETTER_SOUND_SYLLABLES.map((syllable) => [
          letterAudioIdOf(syllable),
          { duration_ms: 640, speech_end_ms: 560 },
        ]),
      ),
    );
    await reachEntry("google", uploaded);
    vi.stubGlobal("NativeModules", {
      ...(NativeModules as Record<string, unknown>),
      AudioPlaybackModule: { play, stop: vi.fn<() => void>() },
    });
    startBasics();

    expect(screen.getByTestId("entry-basics-lead").textContent).toContain("Tap a letter");
    fireEvent.tap(screen.getByTestId("entry-basics-letter-0"), {});
    expect(play.mock.calls.map((call) => call[0])).toEqual([
      expect.stringContaining("/audio/letters/ga.m4a"),
    ]);
  });
});

describe("알림 권한은 첫 스토리 뒤", () => {
  test.each([
    ["끝내고", finishStory],
    ["건너뛰고", skipStory],
    ["나와", exitStory],
  ] as const)(
    "EBI9. 가이드 위에서는 묻지 않고, 스토리를 %s 지도로 오면 한 번 묻는다",
    async (_how, leave) => {
      const { host } = await reachEntry();
      await jumpIn();
      expect(onMapWithGuide()).toBe(true);
      await waitPastPrompt();
      expect(host.register).not.toHaveBeenCalled();

      await openStory();
      await waitPastPrompt();
      expect(host.register).not.toHaveBeenCalled();

      await leave();
      expect(present("journey-map-screen")).toBe(true);
      expect(host.register).not.toHaveBeenCalled();
      await waitPastPrompt();
      expect(host.register).toHaveBeenCalledTimes(1);
      expect(pending(host)).toBeUndefined();

      await waitPastPrompt();
      expect(host.register).toHaveBeenCalledTimes(1);
    },
  );

  test("EBI10. 다른 탭에 있으면 기다렸다가 지도로 돌아와 묻는다", async () => {
    const { host } = await reachEntry();
    await jumpIn();
    await openStory();
    await skipStory();
    fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay"), {});
    await waitPastPrompt();
    expect(host.register).not.toHaveBeenCalled();

    fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
    await waitPastPrompt();
    expect(host.register).toHaveBeenCalledTimes(1);
  });

  test("EBI11. 스토리 전에 끄고 다시 켜도 스토리 뒤에 묻는다", async () => {
    const first = await reachEntry();
    await jumpIn();
    const { host } = await relaunch(first.host.store);

    expect(onMapWithGuide()).toBe(true);
    await waitPastPrompt();
    expect(host.register).not.toHaveBeenCalled();
    await openStory();
    await skipStory();
    await waitPastPrompt();
    expect(host.register).toHaveBeenCalledTimes(1);
  });

  test("EBI12. 기초 도중에 꺼서 입장 화면을 다시 보지 않아도 스토리 뒤에 묻는다", async () => {
    const first = await reachEntry();
    startBasics();
    const { host, events } = await relaunch(first.host.store);

    expect(onMapWithGuide()).toBe(true);
    expect(names(events)).not.toContain("entry_completed");
    await openStory();
    await skipStory();
    await waitPastPrompt();
    expect(host.register).toHaveBeenCalledTimes(1);
  });

  test("EBI13. 스토리 뒤 묻기 전에 꺼도 다시 켠 지도에서 묻는다", async () => {
    const first = await reachEntry();
    await jumpIn();
    await openStory();
    await skipStory();
    expect(first.host.register).not.toHaveBeenCalled();
    const { host } = await relaunch(first.host.store);

    await waitPastPrompt();
    expect(host.register).toHaveBeenCalledTimes(1);
  });

  test("EBI14. 표식 없는 기존 계정은 세션으로 켜서 스토리를 나와도 묻지 않는다", async () => {
    const first = await reachEntry();
    await jumpIn();
    const store = new Map(first.host.store);
    store.delete(pushPromptStorageKey("user-1"));
    const { host } = await relaunch(store);

    await openStory();
    await skipStory();
    await waitPastPrompt();
    expect(host.register).not.toHaveBeenCalled();
  });

  test("EBI15. 이미 허용한 기기는 입장 때 토큰을 바로 올린다", async () => {
    const { host } = await reachEntry();
    const modules = NativeModules as Record<string, object>;
    vi.stubGlobal("NativeModules", {
      ...modules,
      PushNotificationModule: {
        ...modules["PushNotificationModule"],
        getStatus: (callback: (payload: unknown) => void) => callback({ permission: "authorized" }),
      },
    });
    await jumpIn();

    expect(host.register).toHaveBeenCalledTimes(1);
  });

  test("EBI16. 머리의 모달이 열려 있으면 닫힌 뒤에 묻는다", async () => {
    const { host } = await reachEntry();
    await jumpIn();
    await openStory();
    await skipStory();
    fireEvent.tap(screen.getByTestId("top-bar-trophy"), {});
    expect(present("journey-stat-modal-trophy")).toBe(true);

    await waitPastPrompt();
    expect(host.register).not.toHaveBeenCalled();

    await pressBack();
    expect(present("journey-stat-modal-trophy")).toBe(false);
    await waitPastPrompt();
    expect(host.register).toHaveBeenCalledTimes(1);
  });

  test("EBI17. Letters 추천이 기다리는 중이면 추천이 먼저이고 닫힌 뒤에 묻는다", async () => {
    const { host } = await reachEntry();
    await jumpIn();
    await openStory();
    await skipStory();
    await leaveFirstLesson();
    expect(present("journey-map-screen")).toBe(true);

    await waitPastPrompt();
    expect(present("letters-recommend")).toBe(true);
    expect(host.register).not.toHaveBeenCalled();

    await pressBack();
    expect(present("letters-recommend")).toBe(false);
    await waitPastPrompt();
    expect(host.register).toHaveBeenCalledTimes(1);
  });

  test("EBI18. 답을 기다리는 동안 표식이 남고, 답한 뒤 지운다", async () => {
    const { host } = await reachEntry();
    let answer: (() => void) | null = null;
    host.register.mockImplementation((callback) => {
      answer = () =>
        callback({ permission: "authorized", token: "push-token-1", environment: "sandbox" });
    });
    await jumpIn();
    await openStory();
    await skipStory();
    await waitPastPrompt();
    expect(host.register).toHaveBeenCalledTimes(1);
    expect(pending(host)).toBe("pending");

    act(() => answer?.());
    await settle();
    expect(pending(host)).toBeUndefined();
  });

  test("EBI21. 답을 기다리는 동안 다른 안내가 서지 않고, 답한 뒤에 선다", async () => {
    const { host } = await reachEntry();
    let answer: (() => void) | null = null;
    host.register.mockImplementation((callback) => {
      answer = () => callback({ permission: "denied" });
    });
    await jumpIn();
    await openStory();
    await skipStory();
    await waitPastPrompt();
    expect(host.register).toHaveBeenCalledTimes(1);

    await leaveFirstLesson();
    await waitPastPrompt();
    expect(present("letters-recommend")).toBe(false);

    act(() => answer?.());
    await settle();
    await waitPastPrompt();
    expect(present("letters-recommend")).toBe(true);
  });

  test("EBI19. 새 가입 판정을 기다리는 사이 꺼도 스토리 뒤에 묻는다", async () => {
    const never = () => new Promise<never>(() => {});
    stubServer({ progress: never, profile: never });
    const first = stubHost();
    bootToOnboarding();
    completeOnboarding();
    await tapSocial("google");
    const { host } = await relaunch(first.store);

    await openStory();
    await skipStory();
    await waitPastPrompt();
    expect(host.register).toHaveBeenCalledTimes(1);
  });

  test("EBI20. 기존 회원으로 판정되면 표식이 남지 않는다 — 로그인 때 한 번만 묻는다", async () => {
    stubServer({
      progress: noRecord,
      profile: answerWith(jsonReply(learnerProfileRecord)),
    });
    const host = stubHost();
    bootToOnboarding();
    completeOnboarding();
    await tapSocial("google");

    expect(pending(host)).toBeUndefined();
    expect(host.register).toHaveBeenCalledTimes(1);
  });
});
