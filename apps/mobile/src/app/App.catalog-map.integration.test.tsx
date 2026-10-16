import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import type { AppJourneySeed } from "./journey-progress";
import { resetPushWiringForTests } from "./push-wiring";
import { pushOpenedEventName } from "./use-opened-push";
import { contentNotFoundResponse, isContentRequest } from "./test-helpers/content-requests";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { CONTENT_MANIFEST_KEY } from "../lib/episode-cache";
import { minimalRoleplayTurnWire } from "../lib/episode-content.test-support";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { sha256Hex, utf8Bytes } from "../lib/sha256";
import { systemBackEventName } from "../lib/system-back";
import { EPISODE_BANNER_HOLD_MS } from "../screens/catalog-cover/episode-banner";
import { journeySteps } from "../screens/journey-map/journey-map";
import { catalogMapSectionsOf } from "../screens/journey-map/catalog-map";
import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";

// `integration` 계층: 앱 세션에서 「카탈로그 읽기 → 맵 구획 → 표지 열기 → 컷 끝 → 진행 저장 → 다음 실행」과
// 「갱신 뒤 같은 트리에서 구획이 서는 것」, 이벤트 sink 경계를 한 트리에서 봅니다. 대역은 경계뿐입니다 —
// `NativeModules`(저장소 · 시스템 뒤로 · 푸시) · `fetch`(Supabase 갱신 · 학습 RPC · 콘텐츠 버킷) · `vi.stubEnv`.
// 카탈로그 · 갱신 · 캐시 · 진행 모듈은 실물입니다.

const supabaseUrl = "https://test.supabase.co";
const manifestSuffix = "/storage/v1/object/public/content/manifest.json";

type Rpc = { readonly name: string; readonly body: Record<string, unknown> };

const refreshedBody = JSON.stringify({
  access_token: `e30.${btoa(JSON.stringify({ sub: "u" })).replace(/=+$/, "")}.sig`,
  refresh_token: "refreshed-refresh",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "u" },
});

// 튜토리얼 최종 테스트까지 끝낸 진행(씨앗)입니다 — 첫 표지가 열리는 조건입니다.
const tutorialDoneSeed: AppJourneySeed = {
  completedStepCount: journeySteps.length,
  completedMessengerUnitIds: ["appointment-confirmation"],
  completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
  visualNovelProgress: { status: "completed", beatIndex: 2 },
  completedEpisodeFinalIds: ["tutorial-final-test"],
};

// 같은 진행을 서버 스냅숏으로 내린 것입니다.
const tutorialDoneSnapshot = {
  version: 1,
  completedStepCount: journeySteps.length,
  completedEpisodeIntroIds: ["tutorial-intro"],
  completedMessengerUnitIds: ["appointment-confirmation"],
  completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
  visualNovel: { status: "completed", beatIndex: 2 },
  completedEpisodeFinalIds: ["tutorial-final-test"],
};

// ---------------------------------------------------------------- 넷째 에피소드 픽스처(와이어)

const t3 = (ko: string) => ({ ko, roman: `r-${ko}`, en: `e-${ko}` });

// 디코드를 통과하는 최소 에피소드입니다. `preCuts`만 바꿉니다.
function minimalEpisodeText(unitId: string, preCuts: readonly unknown[]): string {
  const post = {
    index: 1,
    kind: "post",
    cut_kind: "narration",
    narration: t3("지문"),
    image_brief: "brief",
    image_url: "",
  };
  const line = (seq: number) => ({
    seq,
    role: seq % 2 === 1 ? "counterpart" : "player",
    text: t3(`대사${seq}`),
    audio_url: "",
  });
  const options = [1, 2, 3].map((n) => {
    const option = { id: `o${n}`, ko: `보기${n}`, roman: `bogi${n}`, correct: n === 1 };
    return n === 1 ? option : { ...option, why_wrong: "이 자리에 맞는 말이 아니다" };
  });
  const roleLine = {
    id: "S1-01",
    type: "ROLE_LINE",
    mode: "choice",
    event: "R",
    prompt: { ko: "질문", en: "question" },
    context: t3("상대 대사"),
    options,
    feedback: { correct: { ko: "맞아요" }, wrong_option: "o2" },
  };
  return JSON.stringify({
    schema: "delivery-2",
    unit_id: unitId,
    title: "최소 에피소드",
    day: 1,
    time_of_day: "낮",
    place: "최소 에피소드",
    counterpart: "미나",
    pre_cuts: preCuts,
    dialogue: [line(1), line(2)],
    post_cuts: [post],
    steps: [
      { id: "S1", order: 1, items: [roleLine] },
      { id: "RP", order: 2, items: [minimalRoleplayTurnWire("RP-01")] },
    ],
    words: [{ id: "voca:1", ko: "물", roman: "mul", gloss_en: "water", role: "target" }],
    patterns: [{ id: "patt:1", ko: "{명사} 주세요", roman: "juseyo", gloss_en: "please give me" }],
  });
}

const placeholderCut = {
  index: 1,
  kind: "pre",
  cut_kind: "speech",
  speaker: "점원",
  line: { ko: "저는 {이름}이에요.", roman: "jeoneun {이름}ieyo.", en: "Hello, I'm {이름}." },
  // speech 컷은 지문이 필수다(와이어 스키마) — 빠지면 디코드가 실패해 넷째 에피소드가 잠긴다.
  aside: t3("웃으며"),
  image_brief: "brief",
  image_url: "",
};

const u04Text = minimalEpisodeText("u04-x", [placeholderCut]);

// 내장 매니페스트 원문에 넷째 항목만 더한 서버 매니페스트입니다(내장 셋은 같은 버전 · 해시라 그대로).
function remoteManifestText(): string {
  const bundled = JSON.parse(
    readFileSync(resolve(process.cwd(), "content/manifest.json"), "utf8"),
  ) as { episodes: unknown[] } & Record<string, unknown>;
  return JSON.stringify({
    ...bundled,
    episodes: [
      ...bundled.episodes,
      {
        id: "u04-x",
        order: 4,
        title: "제목 u04-x",
        schema: "delivery-2",
        version: "2026-10-13.1",
        sha256: sha256Hex(utf8Bytes(u04Text)),
        bytes: utf8Bytes(u04Text).length,
        url: "episodes/u04-x.json",
      },
    ],
  });
}

// ---------------------------------------------------------------- 부팅

type BootOptions = {
  readonly seed?: AppJourneySeed;
  /** `load_learning_progress`의 답입니다. 기본 `null`(서버에 진행 없음). */
  readonly load?: object | null;
  /** 서버가 내주는 콘텐츠입니다. 없으면 버킷 요청은 전부 404입니다. */
  readonly serve?: { readonly manifest: string; readonly episodes: Record<string, string> };
  /** 참이면 에피소드 본문 응답을 `releaseBodies()`까지 붙잡아 둡니다. */
  readonly holdBodies?: boolean;
  /** 부팅 전에 기기 저장소에 둘 값입니다. */
  readonly preStore?: Record<string, string>;
  readonly supabase?: boolean;
  readonly backHost?: { readonly respond: (token: string, outcome: string) => void };
  /** 부팅 때 호스트가 쥔 푸시 목적지입니다. 주면 푸시 모듈 대역을 세웁니다. */
  readonly pushOpened?: unknown;
};

type Booted = {
  readonly rpcs: Rpc[];
  readonly urls: string[];
  readonly events: EpisodeIntroEvent[];
  readonly releaseBodies: () => void;
};

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

type PushHost = { opened: unknown };
const pushHost: PushHost = { opened: null };

async function boot(options: BootOptions = {}): Promise<Booted> {
  const store = new Map<string, string>(Object.entries(options.preStore ?? {}));
  store.set(
    authSessionStorageKey,
    serializeAuthSession({ accessToken: "a", refreshToken: "r", expiresAt: 4_102_444_800_000 }),
  );
  store.set(learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue);
  pushHost.opened = options.pushOpened ?? null;
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
    ...(options.backHost === undefined
      ? {}
      : { SystemBackModule: { ready: vi.fn<() => void>(), respond: options.backHost.respond } }),
    ...(options.pushOpened === undefined
      ? {}
      : {
          PushNotificationModule: {
            getStatus: (callback: (payload: unknown) => void) =>
              callback({ permission: "not-determined" }),
            register: vi.fn<() => void>(),
            takeOpened: (callback: (payload: unknown) => void) => {
              const target = pushHost.opened;
              pushHost.opened = null;
              callback({ target });
            },
            openSettings: vi.fn<() => void>(),
          },
        }),
  });
  if (options.supabase !== false) {
    vi.stubEnv("PUBLIC_SUPABASE_URL", supabaseUrl);
    vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  }

  const rpcs: Rpc[] = [];
  const urls: string[] = [];
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  vi.stubGlobal("fetch", (url: string, init?: { body?: string }) => {
    urls.push(url);
    if (url.includes("grant_type=refresh_token")) {
      return Promise.resolve({ status: 200, text: async () => refreshedBody });
    }
    if (isContentRequest(url)) {
      if (options.serve === undefined) return Promise.resolve(contentNotFoundResponse());
      if (url.endsWith(manifestSuffix)) {
        return Promise.resolve({ status: 200, text: async () => options.serve?.manifest ?? "" });
      }
      const id = /\/episodes\/([^/]+)\.json$/.exec(url)?.[1];
      const body = id === undefined ? undefined : options.serve.episodes[id];
      if (body === undefined) return Promise.resolve(contentNotFoundResponse());
      const reply = { status: 200, text: async () => body };
      return options.holdBodies === true ? gate.then(() => reply) : Promise.resolve(reply);
    }
    const name = url.split("/rest/v1/rpc/")[1] ?? url;
    rpcs.push({ name, body: JSON.parse(init?.body ?? "{}") as Record<string, unknown> });
    const reply =
      name === "load_learning_progress"
        ? { status: 200, body: JSON.stringify(options.load ?? null) }
        : name === "learning_streak" || name === "record_learning_days"
          ? { status: 200, body: "1" }
          : { status: 204, body: "" };
    return Promise.resolve({ status: reply.status, text: async () => reply.body });
  });

  const events: EpisodeIntroEvent[] = [];
  vi.useFakeTimers();
  render(
    <App
      {...(options.seed === undefined ? {} : { journeySeed: options.seed })}
      completedEpisodeIntroIds={["tutorial-intro"]}
      episodeIntroEventSink={(event) => events.push(event)}
    />,
  );
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  vi.useRealTimers();
  await flush();
  return { rpcs, urls, events, releaseBodies: release };
}

afterEach(() => {
  cleanup();
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------- 조작 · 관찰 헬퍼

const cover = (episodeId: string) =>
  screen.getByTestId(`ui-lynx-learning-unit-catalog-cover-${episodeId}`);
const tapCover = (episodeId: string) => void fireEvent.tap(cover(episodeId), {});
// 이름이 드는 표지는 기록이 없으면 앞에 가드 화면이 섭니다 - 건너뛰면 기본 문구(「이름」)로 표지가 이어집니다.
const skipProfileGate = () =>
  void fireEvent.tap(
    within(screen.getByTestId("learner-profile-gate-skip")).getByTestId("ui-lynx-button"),
    {},
  );
const tapNext = () =>
  void fireEvent.tap(
    within(screen.getByTestId("catalog-cover-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );
const tapIntroNext = () =>
  void fireEvent.tap(
    within(screen.getByTestId("episode-intro-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );
const tapIntroSkip = () =>
  void fireEvent.tap(
    within(screen.getByTestId("episode-intro-screen-skip")).getByTestId("ui-lynx-button"),
    {},
  );
const tapIntroBack = () =>
  void fireEvent.tap(
    within(screen.getByTestId("episode-intro-screen-back")).getByTestId("ui-lynx-round-button"),
    {},
  );
const tapDialogAction = (id: "skip" | "stay") =>
  void fireEvent.tap(
    within(screen.getByTestId(`ui-lynx-dialog-action-${id}`)).getByTestId("ui-lynx-button"),
    {},
  );

// 배너의 유지 시간만 가짜 시계로 밉니다 - 부팅 뒤 배너 앞에서 켜고 `passBanner`가 되돌립니다.
const useBannerClock = () => void vi.useFakeTimers();
async function settleFake(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}
/** 배너가 서 있으면 유지 시간만큼 밀어 닫고 실제 시계로 돌아갑니다. */
function passBanner(): void {
  if (screen.queryByTestId("episode-banner-screen") !== null) {
    act(() => {
      vi.advanceTimersByTime(EPISODE_BANNER_HOLD_MS);
    });
  }
  vi.useRealTimers();
}
const presentId = (id: string): boolean => screen.queryByTestId(id) !== null;
const realCatalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});
const sectionTitleOf = (episodeId: string): string =>
  catalogMapSectionsOf(realCatalog).find((section) => section.episodeId === episodeId)?.title ?? "";

/** 컷을 끝까지 넘깁니다 — 컷 여섯 개면 Next 다섯 번 + 마지막 Continue. 대사를 쓰는 중이면 첫 탭은 완성이라 한 번 더 누릅니다. */
function readAllCuts(count: number): void {
  for (let i = 0; i < count; i += 1) {
    const dialog = screen.queryByTestId("ui-lynx-visual-novel-dialog");
    if (dialog?.getAttribute("data-status") === "revealing") tapNext();
    tapNext();
  }
}

function headingAxis(container: HTMLElement): readonly (string | null)[] {
  return [...container.querySelectorAll("[accessibility-traits]")]
    .filter((el) => (el.getAttribute("accessibility-traits") ?? "").split(",").includes("header"))
    .map((el) => el.getAttribute("data-testid") ?? el.getAttribute("class"));
}

const savedProgress = (rpcs: readonly Rpc[]): Record<string, unknown>[] =>
  rpcs
    .filter((rpc) => rpc.name === "save_learning_progress")
    .map((rpc) => rpc.body["p_progress"] as Record<string, unknown>);

const catalogProgressOf = (snapshot: Record<string, unknown>) =>
  snapshot["catalogProgress"] as Record<string, string[]> | undefined;

function precedes(a: Element, b: Element): boolean {
  return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

// ---------------------------------------------------------------- 테스트

test("I1. (AC1) 콘텐츠 404 · 진행 없음: 튜토리얼 다음에 에피소드 1 · 2 · 3 구획이 서고 표지는 모두 잠겨 있다", async () => {
  await boot();

  const tutorial = screen.getByTestId("ui-lynx-learning-unit-greeting");
  const sections = ["u01-water", "u02-checkin", "u03-mina"].map((id) =>
    screen.getByTestId(`catalog-section-${id}`),
  );
  expect(precedes(tutorial, sections[0] as Element)).toBe(true);
  expect(precedes(sections[0] as Element, sections[1] as Element)).toBe(true);
  expect(precedes(sections[1] as Element, sections[2] as Element)).toBe(true);
  expect(screen.queryByTestId("episode-pending-customs")).not.toBeInTheDocument();
  for (const id of ["u01-water", "u02-checkin", "u03-mina"]) {
    expect(cover(id)).toHaveAttribute("data-status", "default");
  }
  // spec §20: 띠는 스텝 말풍선이 열린 동안만 서므로 맵만 보일 때 제목 축에 머리 띠가 없다.
  expect(headingAxis(document.body)).toEqual([]);
});

test("I2. (AC1 · 2 · 3) 튜토리얼 완료 씨앗: 첫 표지만 열리고 레슨 노드는 무반응 · 표지 → Next → 컷 → 배너 → 맵 · 진행은 배너 전에 저장된다", async () => {
  const { rpcs } = await boot({ seed: tutorialDoneSeed });

  expect(cover("u01-water")).toHaveAttribute("data-status", "available");
  expect(cover("u02-checkin")).toHaveAttribute("data-status", "default");
  expect(cover("u03-mina")).toHaveAttribute("data-status", "default");

  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-catalog-unit-u01-water-S1"), {});
  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-catalog-unit-u01-water-RP"), {});
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(presentId("episode-intro-screen")).toBe(false);

  useBannerClock();
  tapCover("u01-water");
  expect(screen.getByTestId("episode-intro-screen")).toBeInTheDocument();
  expect(presentId("catalog-cover-screen")).toBe(false);

  tapIntroNext();
  expect(screen.getByTestId("catalog-cover-screen")).toBeInTheDocument();
  expect(presentId("episode-intro-screen")).toBe(false);

  readAllCuts(6);
  await settleFake();

  const banner = screen.getByTestId("episode-banner-screen");
  expect(banner).toHaveAttribute("data-kind", "start");
  expect(banner).toHaveAttribute("accessibility-label", "Episode start!");
  expect(presentId("journey-map-screen")).toBe(false);
  expect(presentId("catalog-cover-screen")).toBe(false);
  // 진행 기록은 배너가 서 있는 동안 이미 저장 본문에 있다.
  await vi.waitFor(() => {
    const last = savedProgress(rpcs).at(-1);
    expect(last).toBeDefined();
    expect(catalogProgressOf(last as Record<string, unknown>)?.["u01-water"]).toContain("intro");
  });
  expect(presentId("episode-banner-screen")).toBe(true);

  passBanner();
  await flush();

  expect(presentId("episode-banner-screen")).toBe(false);
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(cover("u01-water")).toHaveAttribute("data-status", "clear");
  await vi.waitFor(() =>
    expect(rpcs.some((rpc) => rpc.name === "record_learning_days")).toBe(true),
  );
});

test("I3. (AC2 유지) 저장된 스냅숏으로 새 앱을 부팅하면 첫 표지는 완료, 둘째 표지는 잠김이다", async () => {
  await boot({
    load: { ...tutorialDoneSnapshot, catalogProgress: { "u01-water": ["intro"] } },
  });

  expect(cover("u01-water")).toHaveAttribute("data-status", "clear");
  expect(cover("u02-checkin")).toHaveAttribute("data-status", "default");
});

test("I4. (AC6) 본문 없는 넷째 에피소드는 준비 중 구획으로 서고, 갱신이 본문을 받으면 같은 트리에서 일반 구획이 된다", async () => {
  const manifest = remoteManifestText();
  const { events, releaseBodies } = await boot({
    preStore: { [CONTENT_MANIFEST_KEY]: manifest },
    serve: { manifest, episodes: { "u04-x": u04Text } },
    holdBodies: true,
  });

  expect(screen.getByTestId("catalog-unavailable-caption-u04-x")).toHaveTextContent("COMING SOON");
  expect(screen.queryByTestId("catalog-section-u04-x")).not.toBeInTheDocument();

  releaseBodies();

  await vi.waitFor(() => expect(screen.getByTestId("catalog-section-u04-x")).toBeInTheDocument());
  expect(screen.queryByTestId("catalog-unavailable-u04-x")).not.toBeInTheDocument();
  const refreshed = events.filter((event) => event.name === "episode_content_refreshed");
  expect(refreshed).toHaveLength(1);
  expect(refreshed[0]).toMatchObject({ manifest: "unchanged", fetchedCount: "1" });
});

test("I5. (AC4) 넷째 표지의 {이름}은 프로필이 없으면 「이름」으로 보이고 대사를 누르면 로마자로 바뀐다", async () => {
  const manifest = remoteManifestText();
  const { releaseBodies } = await boot({
    seed: tutorialDoneSeed,
    load: { ...tutorialDoneSnapshot, catalogProgress: { "u03-mina": ["RP"] } },
    preStore: { [CONTENT_MANIFEST_KEY]: manifest },
    serve: { manifest, episodes: { "u04-x": u04Text } },
    holdBodies: true,
  });
  releaseBodies();
  await vi.waitFor(() => expect(screen.getByTestId("catalog-section-u04-x")).toBeInTheDocument());

  expect(cover("u04-x")).toHaveAttribute("data-status", "available");
  tapCover("u04-x");
  skipProfileGate();
  tapIntroNext();

  // 대사는 타자기로 쓰이므로 끝까지 보일 때까지 기다립니다.
  await vi.waitFor(() =>
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-line")).toHaveTextContent(
      "저는 이름이에요.",
    ),
  );
  const line = screen.getByTestId("ui-lynx-visual-novel-dialog-line");
  expect(line.textContent).not.toContain("{이름}");

  fireEvent.tap(screen.getByTestId("catalog-cover-screen-line"), { eventType: "catchEvent" });
  expect(screen.getByTestId("catalog-cover-screen")).toHaveAttribute("data-script", "roman");
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog-translation")).toHaveTextContent(
    "jeoneun ireumieyo.",
  );
});

test("I6. (AC5) 이미지는 공개 버킷 주소로 서고 load 전에도 글과 버튼이 있다", async () => {
  await boot({ seed: tutorialDoneSeed });
  tapCover("u01-water");
  tapIntroNext();

  expect(screen.getByTestId("narrative-background-image")).toHaveAttribute(
    "src",
    `${supabaseUrl}/storage/v1/object/public/content/images/u01-water/pre-1.jpg`,
  );
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog-line")).toBeInTheDocument();
  expect(screen.getByTestId("catalog-cover-screen-next")).toBeInTheDocument();
});

// 설정 없는 부팅은 저장된 세션 갱신이 실패해 맵에 닿지 않는다 — 이미지 URL이 없는 컷으로 같은 경로(AC5)를 본다.
test("I6b. (AC5) 이미지 경로가 비어 있는 컷은 이미지 요소 없이 패널과 진행 버튼이 선다", async () => {
  const manifest = remoteManifestText();
  const { releaseBodies } = await boot({
    seed: tutorialDoneSeed,
    load: { ...tutorialDoneSnapshot, catalogProgress: { "u03-mina": ["RP"] } },
    preStore: { [CONTENT_MANIFEST_KEY]: manifest },
    serve: { manifest, episodes: { "u04-x": u04Text } },
    holdBodies: true,
  });
  releaseBodies();
  await vi.waitFor(() => expect(screen.getByTestId("catalog-section-u04-x")).toBeInTheDocument());
  tapCover("u04-x");
  skipProfileGate();
  tapIntroNext();

  expect(screen.queryByTestId("narrative-background-image")).not.toBeInTheDocument();
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog-line")).toBeInTheDocument();
  expect(screen.getByTestId("catalog-cover-screen-next")).toBeInTheDocument();
});

test("I7. (측정) 열기 · 표지에서 나가기 · 다시 열기 · Next · 끝내기가 순서대로 나가고 404 실행은 갱신 이벤트가 없다", async () => {
  const { events } = await boot({ seed: tutorialDoneSeed });

  tapCover("u01-water");
  tapIntroBack();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  tapCover("u01-water");
  tapIntroNext();
  readAllCuts(6);

  expect(events).toEqual([
    { name: "episode_intro_viewed", episodeId: "u01-water" },
    { name: "episode_intro_exited", episodeId: "u01-water", stage: "intro" },
    { name: "episode_intro_viewed", episodeId: "u01-water" },
    { name: "episode_intro_continued", episodeId: "u01-water", hasPrologue: true },
    { name: "episode_prologue_completed", episodeId: "u01-water", prologueKind: "cuts" },
  ]);
});

test("I8. 컷 화면에서 시스템 뒤로를 누르면 맵으로 돌아가고 진행을 기록하지 않는다", async () => {
  const respond = vi.fn<(token: string, outcome: string) => void>();
  const { rpcs, events } = await boot({ seed: tutorialDoneSeed, backHost: { respond } });
  tapCover("u01-water");
  tapIntroNext();
  expect(screen.getByTestId("catalog-cover-screen")).toBeInTheDocument();

  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit(systemBackEventName, ["1"]);
  });
  await flush();

  expect(respond).toHaveBeenCalledWith("1", "handled");
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("catalog-cover-screen")).not.toBeInTheDocument();
  expect(cover("u01-water")).toHaveAttribute("data-status", "available");
  for (const snapshot of savedProgress(rpcs)) {
    expect(catalogProgressOf(snapshot)).toBeUndefined();
  }
  // 컷에서 나가면 stage는 prologue입니다(표지에서 나갈 때의 intro와 갈립니다).
  expect(events.at(-1)).toEqual({
    name: "episode_intro_exited",
    episodeId: "u01-water",
    stage: "prologue",
  });
});

test.each<[string, unknown]>([
  ["카탈로그 표지 목적지", { kind: "catalog-cover", episodeId: "u01-water" }],
  ["에피소드 표지 유닛 목적지", { kind: "episode-intro", unitId: "u01-water" }],
])("I10. 푸시 진입 %s은 잠긴 카탈로그 표지를 열지 못하고 맵에 남는다", async (_name, opened) => {
  const { events } = await boot({ pushOpened: opened });
  await flush();

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("catalog-cover-screen")).not.toBeInTheDocument();
  expect(cover("u01-water")).toHaveAttribute("data-status", "default");
  expect(events).toEqual([]);
});

test("I10b. 켜진 채 받은 푸시도 잠긴 카탈로그 표지를 열지 못한다", async () => {
  await boot({ pushOpened: {} });
  pushHost.opened = { kind: "catalog-cover", episodeId: "u01-water" };

  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit(pushOpenedEventName, []);
  });
  await flush();

  expect(screen.queryByTestId("catalog-cover-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
});

// ---------------------------------------------------------------- 표지 화면 · 시작 배너

const pressSystemBack = (token: string): void =>
  void act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit(systemBackEventName, [token]);
  });
const levelOf = (episodeId: string, key: string) =>
  screen
    .getByTestId(`ui-lynx-learning-unit-catalog-unit-${episodeId}-${key}`)
    .getAttribute("data-status");

test("I11. (AC1 · 3) 표지 화면: 첫 줄 Episode 1. · 둘째 줄 에피소드 이름 · Skip · Next · 머리말 축 하나이고 Next가 컷 1을 연다", async () => {
  const { events } = await boot({ seed: tutorialDoneSeed });

  tapCover("u01-water");

  expect(screen.getByTestId("episode-intro-screen")).toBeInTheDocument();
  expect(presentId("catalog-cover-screen")).toBe(false);
  expect(screen.getByTestId("episode-intro-screen-label")).toHaveTextContent("Episode 1.");
  const title = sectionTitleOf("u01-water");
  expect(title).not.toBe("");
  const titleLines = screen
    .getAllByTestId("episode-intro-screen-title")
    .map((line) => line.textContent ?? "");
  expect(titleLines.join(" ")).toBe(title);
  expect(screen.getByTestId("episode-intro-screen-heading")).toHaveAttribute(
    "accessibility-label",
    `Episode 1. ${title}`,
  );
  expect(screen.getByTestId("episode-intro-screen-skip")).toBeInTheDocument();
  expect(screen.getByTestId("episode-intro-screen-next")).toBeInTheDocument();
  expect(headingAxis(screen.getByTestId("episode-intro-screen"))).toEqual([
    "episode-intro-screen-heading",
  ]);
  expect(events).toEqual([{ name: "episode_intro_viewed", episodeId: "u01-water" }]);

  tapIntroNext();

  expect(screen.getByTestId("catalog-cover-screen")).toBeInTheDocument();
  expect(presentId("episode-intro-screen")).toBe(false);
  expect(events).toEqual([
    { name: "episode_intro_viewed", episodeId: "u01-water" },
    { name: "episode_intro_continued", episodeId: "u01-water", hasPrologue: true },
  ]);
});

test("I12b. (측정) 이미 끝낸 표지를 다시 열어 건너뛰면 skipped 이벤트가 나가지 않는다", async () => {
  const { events } = await boot({ seed: tutorialDoneSeed });

  tapCover("u01-water");
  tapIntroSkip();
  tapDialogAction("skip");
  await flush();
  expect(cover("u01-water")).toHaveAttribute("data-status", "clear");

  tapCover("u01-water");
  tapIntroSkip();
  tapDialogAction("skip");
  await flush();

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(events).toEqual([
    { name: "episode_intro_viewed", episodeId: "u01-water" },
    { name: "episode_intro_skipped", episodeId: "u01-water" },
    { name: "episode_intro_viewed", episodeId: "u01-water" },
  ]);
});

test("I12. (AC2) Skip 모달의 계속 보기는 표지에 남고, 건너뛰기는 배너 없이 맵 · 표지 완료 · 레슨 1 열림 · 진행 저장", async () => {
  const { rpcs, events } = await boot({ seed: tutorialDoneSeed });
  useBannerClock();

  tapCover("u01-water");
  tapIntroSkip();
  tapDialogAction("stay");
  await settleFake();

  expect(screen.getByTestId("episode-intro-screen")).toBeInTheDocument();
  expect(events).toEqual([{ name: "episode_intro_viewed", episodeId: "u01-water" }]);

  tapIntroSkip();
  tapDialogAction("skip");
  await settleFake();

  expect(presentId("episode-banner-screen")).toBe(false);
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(cover("u01-water")).toHaveAttribute("data-status", "clear");
  expect(levelOf("u01-water", "S1")).toBe("available");
  await vi.waitFor(() => {
    const last = savedProgress(rpcs).at(-1);
    expect(last).toBeDefined();
    expect(catalogProgressOf(last as Record<string, unknown>)?.["u01-water"]).toContain("intro");
  });
  act(() => {
    vi.advanceTimersByTime(EPISODE_BANNER_HOLD_MS);
  });
  expect(presentId("episode-banner-screen")).toBe(false);
  expect(events).toEqual([
    { name: "episode_intro_viewed", episodeId: "u01-water" },
    { name: "episode_intro_skipped", episodeId: "u01-water" },
  ]);
});

test("I13. (AC4) 표지에서 시스템 뒤로는 맵으로 돌아가 진행을 기록하지 않고, 모달이 떠 있으면 모달만 닫는다", async () => {
  const respond = vi.fn<(token: string, outcome: string) => void>();
  const { rpcs, events } = await boot({ seed: tutorialDoneSeed, backHost: { respond } });

  tapCover("u01-water");
  pressSystemBack("1");
  await flush();

  expect(respond).toHaveBeenCalledWith("1", "handled");
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(presentId("episode-intro-screen")).toBe(false);
  expect(cover("u01-water")).toHaveAttribute("data-status", "available");
  for (const snapshot of savedProgress(rpcs)) {
    expect(catalogProgressOf(snapshot)).toBeUndefined();
  }
  expect(events).toEqual([
    { name: "episode_intro_viewed", episodeId: "u01-water" },
    { name: "episode_intro_exited", episodeId: "u01-water", stage: "intro" },
  ]);

  tapCover("u01-water");
  tapIntroSkip();
  expect(presentId("ui-lynx-dialog-action-skip")).toBe(true);
  const before = events.length;
  pressSystemBack("2");
  await flush();

  expect(respond).toHaveBeenCalledWith("2", "handled");
  expect(presentId("ui-lynx-dialog-action-skip")).toBe(false);
  expect(screen.getByTestId("episode-intro-screen")).toBeInTheDocument();
  expect(events).toHaveLength(before);
});

test("I14. (AC6) 배너에서 탭하면 곧장 맵이고 스택은 맵 하나이며 유지 시간이 지나도 변화가 없다", async () => {
  const respond = vi.fn<(token: string, outcome: string) => void>();
  const { events } = await boot({ seed: tutorialDoneSeed, backHost: { respond } });
  useBannerClock();

  tapCover("u01-water");
  tapIntroNext();
  readAllCuts(6);
  await settleFake();
  expect(screen.getByTestId("episode-banner-screen")).toBeInTheDocument();
  const before = events.length;

  fireEvent.tap(screen.getByTestId("episode-banner-screen"), {});
  await settleFake();

  expect(presentId("episode-banner-screen")).toBe(false);
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  act(() => {
    vi.advanceTimersByTime(EPISODE_BANNER_HOLD_MS);
  });
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(events).toHaveLength(before);
  pressSystemBack("1");
  await settleFake();
  expect(respond).toHaveBeenCalledWith("1", "leave");
});

test("I14b. (AC6) 배너에서 시스템 뒤로는 넘어가기이고 맵 하나만 남아 다음 뒤로는 앱을 떠난다", async () => {
  const respond = vi.fn<(token: string, outcome: string) => void>();
  const { events } = await boot({ seed: tutorialDoneSeed, backHost: { respond } });
  useBannerClock();

  tapCover("u01-water");
  tapIntroNext();
  readAllCuts(6);
  await settleFake();
  expect(screen.getByTestId("episode-banner-screen")).toBeInTheDocument();
  const before = events.length;

  pressSystemBack("1");
  await settleFake();

  expect(respond).toHaveBeenCalledWith("1", "handled");
  expect(presentId("episode-banner-screen")).toBe(false);
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  act(() => {
    vi.advanceTimersByTime(EPISODE_BANNER_HOLD_MS);
  });
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(events).toHaveLength(before);
  pressSystemBack("2");
  await settleFake();
  expect(respond).toHaveBeenCalledWith("2", "leave");
});
