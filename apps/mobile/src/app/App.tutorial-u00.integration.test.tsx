import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, test, vi } from "vitest";
import { act, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { bundledContentImages, bundledContentImageUrl } from "../lib/bundled-content-images";
import { bundledCatalogInput } from "../lib/episode-bundled";
import { sha256Hex, utf8Bytes } from "../lib/sha256";
import { TUTORIAL_EPISODE_ID } from "../lib/tutorial-episode";
import {
  cover,
  exitResult,
  lessonPlan,
  node,
  resetApp,
  status,
  tapButtonIn,
  tapId,
  tapNode,
  title,
} from "./test-helpers/episode-format-harness";
import { solveActivity } from "./test-helpers/episode-format-solvers";
import { tutorialCoverDoneProgress, tutorialDoneProgress } from "./test-helpers/progress-seed";
import {
  bootTutorialApp,
  finalPlanOf,
  flushAsync,
  passBanner,
  readAllCuts,
  settleFake,
  solveFinalTurns,
  tapCover,
  tapCutNext,
  tapIntroNext,
  useBannerClock,
} from "./test-helpers/tutorial-boot";

// `integration` 계층: 튜토리얼이 카탈로그 에피소드 u00-tutorial이 된 앱 — 오프라인 새 설치의 내장 본문 · 그림,
// u00 → Episode 1 문, 실제 최종 통과의 진행 · 이벤트 · Airbridge, 롤플레이 회귀, 지운 진입, 스테이징 교체,
// 첫 유닛 안내, 분석 값, 설문, 티켓을 한 트리에서 봅니다. 대역은 경계뿐입니다(공용 헬퍼 참고).

afterEach(resetApp);

const U00 = TUTORIAL_EPISODE_ID;
const U01 = "u01-water";
const imageSrcs = (): (string | null)[] =>
  screen.queryAllByTestId("narrative-background-image").map((image) => image.getAttribute("src"));
const bundledValues: ReadonlySet<string> = new Set(Object.values(bundledContentImages));
const preCutPath = (n: number) => `images/u00-tutorial/pre-${String(n)}.webp`;
const keysWithout = (omit: string): string[] =>
  (tutorialDoneProgress()[U00] ?? []).filter((key) => key !== omit);

/** 표지 → Next → 컷 여섯을 읽으며 컷마다 그림 주소를 확인하고 배너 → 맵까지 갑니다. */
async function walkCoverExpecting(srcOf: (cutNumber: number) => string | null): Promise<void> {
  useBannerClock();
  tapCover();
  tapIntroNext();
  for (let cut = 1; cut <= 6; cut += 1) {
    const srcs = imageSrcs();
    expect(srcs.length).toBeGreaterThan(0);
    expect(srcs).toContain(srcOf(cut));
    const dialog = screen.queryByTestId("ui-lynx-visual-novel-dialog");
    if (dialog?.getAttribute("data-status") === "revealing") tapCutNext();
    tapCutNext();
  }
  await settleFake();
  expect(screen.getByTestId("episode-banner-screen")).toHaveAttribute("data-kind", "start");
  passBanner();
  await flushAsync();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(cover(U00)).toHaveAttribute("data-status", "clear");
}

const isImageRequest = (url: string): boolean => /\.(webp|jpe?g|png)(\?|$)/.test(url);

const U00_ITEM_IMAGES = new Set(["images/items/hello.webp", "images/items/thanks.webp"]);

function isU00ImagePath(path: string) {
  return path.startsWith("images/u00-tutorial/") || U00_ITEM_IMAGES.has(path);
}

describe("TU1 새 설치 · 오프라인", () => {
  test("TU1. 맵 첫 구획이 u00이고 표지 컷 그림이 모두 내장 주소이며 받기 호출 0 · 그림 요청 0이다", async () => {
    const download = vi.fn<(url: string, path: string, callback: (p: unknown) => void) => void>();
    const { urls } = await bootTutorialApp({
      offline: true,
      contentFiles: { download, fileUrl: () => "" },
    });

    expect(screen.getByTestId(`catalog-section-${U00}`)).toBeInTheDocument();
    expect(cover(U00)).toHaveAttribute("data-status", "available");
    await walkCoverExpecting((cut) => bundledContentImageUrl(preCutPath(cut)));

    expect(download).not.toHaveBeenCalled();
    expect(urls.filter(isImageRequest)).toEqual([]);
  });

  test("TU1b. 파일 모듈이 없는 환경(Explorer 꼴)도 같은 내장 주소다", async () => {
    const { urls } = await bootTutorialApp({ offline: true });

    await walkCoverExpecting((cut) => bundledContentImageUrl(preCutPath(cut)));

    for (const src of imageSrcs()) expect(bundledValues.has(src ?? "")).toBe(true);
    expect(urls.filter(isImageRequest)).toEqual([]);
  });

  test("TU1c. 온라인에서 매니페스트가 내장과 같으면 u00 그림은 받지 않고 완료 표시만 쓴다", async () => {
    const manifest = readFileSync(resolve(process.cwd(), "content/manifest.json"), "utf8");
    const download = vi.fn((_url: string, _path: string, callback: (p: unknown) => void) =>
      callback({ status: "saved", bytes: "1" }),
    );
    const { store } = await bootTutorialApp({
      serve: { manifest, episodes: {} },
      contentFiles: { download, fileUrl: () => "" },
    });

    await vi.waitFor(() => expect(store.get(`libitum.content.assets.${U00}`)).toBeDefined());
    const downloaded = download.mock.calls.map((call) => call[1]);
    expect(downloaded.filter(isU00ImagePath)).toEqual([]);
  });
});

describe("TU1d 음성 받기(v3)", () => {
  test("TU1d. 내장과 같은 매니페스트로 온라인 시작하면 u00 그림 받기는 0이고 음성은 audio/u00-tutorial 12개를 받는다", async () => {
    const manifest = readFileSync(resolve(process.cwd(), "content/manifest.json"), "utf8");
    const download = vi.fn<(url: string, path: string, callback: (p: unknown) => void) => void>(
      (_url, _path, callback) => callback({ status: "saved", bytes: "1" }),
    );
    await bootTutorialApp({
      serve: { manifest, episodes: {} },
      contentFiles: { download, fileUrl: () => "" },
    });

    await vi.waitFor(() => {
      const paths = download.mock.calls.map((call) => call[1]);
      expect(paths.filter((path) => path.startsWith("audio/u00-tutorial/"))).toHaveLength(12);
    });
    const downloaded = download.mock.calls.map((call) => call[1]);
    expect(downloaded.filter(isU00ImagePath)).toEqual([]);
    expect(new Set(downloaded.filter((path) => path.startsWith("audio/u00-tutorial/"))).size).toBe(
      12,
    );
  });
});

describe("TU2 u00 → Episode 1", () => {
  test("TU2. 최종(RP)만 남은 진행에서는 u01 표지를 눌러도 화면이 바뀌지 않고, 끝내면 열려 Episode 1.이 선다", async () => {
    await bootTutorialApp({ progressSeed: { catalogProgress: { [U00]: keysWithout("RP") } } });
    expect(cover(U01)).toHaveAttribute("data-status", "default");
    tapCover(U01);
    expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
    expect(screen.queryAllByTestId("episode-intro-screen").length).toBe(0);
    resetApp();

    await bootTutorialApp({ progressSeed: { catalogProgress: tutorialDoneProgress() } });
    expect(cover(U01)).toHaveAttribute("data-status", "available");
    tapCover(U01);
    expect(screen.getByTestId("episode-intro-screen")).toBeInTheDocument();
    expect(screen.getByTestId("episode-intro-screen-label")).toHaveTextContent("Episode 1.");
  });

  test("TU2b. u00 최종 테스트를 실제로 통과하면 u01이 열리고 episode_final_passed 한 번 · Airbridge achieveLevel 한 번이다", async () => {
    const { events, tracked } = await bootTutorialApp({
      progressSeed: { catalogProgress: { [U00]: keysWithout("RP") } },
    });
    const plan = finalPlanOf(U00, 0);
    expect(status(U00, "RP")).toBe("available");

    tapNode(U00, "RP");
    expect(screen.getByTestId("catalog-final-screen")).toBeInTheDocument();
    solveFinalTurns(plan.turns);
    expect(title()).toHaveTextContent("PERFECT LESSON!");
    useBannerClock();
    exitResult();

    expect(screen.getByTestId("catalog-cover-screen")).toBeInTheDocument();
    readAllCuts(4);
    await settleFake();
    expect(screen.getByTestId("episode-banner-screen")).toHaveAttribute("data-kind", "clear");
    passBanner();
    await flushAsync();

    expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
    expect(cover(U01)).toHaveAttribute("data-status", "available");
    const count = String(plan.turns.length);
    expect(events.filter((event) => event.name === "episode_final_passed")).toEqual([
      { name: "episode_final_passed", episodeId: U00, correctCount: count, turnCount: count },
    ]);
    expect(tracked.filter(([category]) => category === "airbridge.achieveLevel")).toEqual([
      ["airbridge.achieveLevel", { level: U00, label: "episode_final" }],
    ]);
  });
});

describe("TU5 · TU6 롤플레이 회귀 · 지운 진입", () => {
  test("TU5. u01을 끝낸 진행의 롤플레이 탭에는 u01 구획만 있고 u00 구획은 없으며 u01 이야기 롤플레이가 미리보기로 열린다", async () => {
    const { events } = await bootTutorialApp({
      progressSeed: {
        catalogProgress: {
          ...tutorialDoneProgress(),
          [U01]: ["intro", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT", "RP"],
        },
      },
    });

    tapId("ui-lynx-bottom-navigator-item-roleplay");

    expect(screen.getByTestId(`roleplay-list-section-${U01}`)).toHaveAttribute(
      "data-unlocked",
      "true",
    );
    expect(screen.queryAllByTestId(`roleplay-list-section-${U00}`).length).toBe(0);
    fireEvent.tap(screen.getByTestId(`roleplay-list-item-story-${U01}`), {});
    expect(screen.getByTestId("roleplay-preview-screen")).toBeInTheDocument();
    expect(events).toContainEqual({ name: "roleplay_story_opened", episodeId: U01 });
  });

  test("TU6. 맵에는 튜토리얼 셀이 없고 u00 표지는 카탈로그 표지 화면을 연다 — 옛 진입은 쌓이지 않는다", async () => {
    await bootTutorialApp();

    for (const id of [
      "ui-lynx-special-unit-tutorial-intro",
      "ui-lynx-special-unit-appointment-confirmation",
      "ui-lynx-special-unit-appointment-confirmation-phone-call",
      "ui-lynx-special-unit-cafe-arrival-visual-novel",
      "ui-lynx-special-unit-tutorial-final-test",
      "ui-lynx-learning-unit-greeting",
    ]) {
      expect(screen.queryAllByTestId(id).length).toBe(0);
    }
    tapCover();
    expect(screen.getByTestId("episode-intro-screen")).toBeInTheDocument();
  });

  test.each([
    { kind: "messenger", unitId: "appointment-confirmation" },
    { kind: "phone-call", unitId: "appointment-confirmation" },
    { kind: "visual-novel", unitId: "cafe-arrival" },
  ])(
    "TU6. 서버 푸시의 $kind 목적지는 여정 탭 루트(맵)에 서서 u00 표지가 보이고 push_notification_opened는 journey-map으로 한 번 난다",
    async (pushOpened) => {
      const { events } = await bootTutorialApp({ pushOpened });
      await flushAsync();

      expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
      expect(cover(U00)).toHaveAttribute("data-status", "available");
      expect(screen.queryAllByTestId("episode-intro-screen").length).toBe(0);
      expect(events.filter((event) => event.name === "push_notification_opened")).toEqual([
        { name: "push_notification_opened", target: "journey-map" },
      ]);
    },
  );
});

describe("TU7 새 버전 교체", () => {
  function newU00Text(): { text: string; manifest: string } {
    const wire = structuredClone(bundledCatalogInput.episodes[U00]) as {
      pre_cuts: { image_url: string }[];
    };
    wire.pre_cuts[0]!.image_url = `content/${preCutPath(1).replace("pre-1", "pre-1-v2")}`;
    const text = JSON.stringify(wire);
    const bundled = JSON.parse(
      readFileSync(resolve(process.cwd(), "content/manifest.json"), "utf8"),
    ) as { episodes: Record<string, unknown>[] } & Record<string, unknown>;
    const manifest = JSON.stringify({
      ...bundled,
      episodes: bundled.episodes.map((entry) =>
        entry["id"] === U00
          ? {
              ...entry,
              version: "2026-10-24.1",
              sha256: sha256Hex(utf8Bytes(text)),
              bytes: utf8Bytes(text).length,
            }
          : entry,
      ),
    });
    return { text, manifest };
  }

  test("TU7. 첫 실행은 새 경로 하나만 받고 같은 실행의 표지는 옛 내장 그림이며, 다음 시작에 컷 1만 받은 파일로 바뀐다", async () => {
    const { text, manifest } = newU00Text();
    const serve = { manifest, episodes: { [U00]: text } };
    const files = new Map<string, string>();
    const download = vi.fn((_url: string, path: string, callback: (p: unknown) => void) => {
      files.set(path, `file:///content/${path}`);
      callback({ status: "saved", bytes: "1" });
    });
    const contentFiles = { download, fileUrl: (path: string) => files.get(path) ?? "" };
    const newPath = "images/u00-tutorial/pre-1-v2.webp";
    const u00Paths = () => download.mock.calls.map((call) => call[1]).filter(isU00ImagePath);

    const first = await bootTutorialApp({ serve, contentFiles });
    await vi.waitFor(() => expect(u00Paths()).toEqual([newPath]));
    useBannerClock();
    tapCover();
    tapIntroNext();
    expect(imageSrcs()).toContain(bundledContentImageUrl(preCutPath(1)));
    resetApp();

    await bootTutorialApp({ serve, contentFiles, store: first.store });
    tapCover();
    tapIntroNext();
    expect(imageSrcs()).toContain(`file:///content/${newPath}`);
    for (let cut = 1; cut < 2; cut += 1) {
      const dialog = screen.queryByTestId("ui-lynx-visual-novel-dialog");
      if (dialog?.getAttribute("data-status") === "revealing") tapCutNext();
      tapCutNext();
    }
    expect(imageSrcs()).toContain(bundledContentImageUrl(preCutPath(2)));
  });
});

describe("TU8 첫 유닛 안내", () => {
  test("TU8. 신규 사용자의 맵에 안내가 서고 표지를 누르면 u00 표지 화면이 열리며 돌아오면 안내가 없다", async () => {
    await bootTutorialApp();

    expect(screen.getByTestId("first-unit-guide-map")).toBeInTheDocument();
    expect(screen.getByTestId("first-unit-map-tooltip")).toHaveTextContent(
      "Tap to start your lesson!",
    );
    tapCover();
    expect(screen.getByTestId("episode-intro-screen")).toBeInTheDocument();
    expect(screen.getByTestId("episode-intro-screen-label")).toHaveTextContent("Episode 0.");

    fireEvent.tap(
      within(screen.getByTestId("episode-intro-screen-back")).getByTestId("ui-lynx-round-button"),
      {},
    );
    expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
    expect(screen.queryAllByTestId("first-unit-guide-map").length).toBe(0);
    expect(screen.queryAllByTestId("first-unit-map-tooltip").length).toBe(0);
  });

  test("TU8. 진행이 있는 사용자에게는 안내가 서지 않는다", async () => {
    await bootTutorialApp({ progressSeed: { catalogProgress: tutorialCoverDoneProgress() } });

    expect(screen.queryAllByTestId("first-unit-guide-map").length).toBe(0);
  });
});

describe("TU9 분석 값", () => {
  test("TU9. 표지 열기 · 레슨 시작 · 끝 이벤트의 episodeId는 u00-tutorial이고 옛 tutorial 값은 0이다", async () => {
    const { events } = await bootTutorialApp();

    tapCover();
    expect(events).toContainEqual({ name: "episode_intro_viewed", episodeId: U00 });
    resetApp();

    const lesson = await bootTutorialApp({
      progressSeed: { catalogProgress: tutorialCoverDoneProgress() },
    });
    const plan = lessonPlan(U00, "S1");
    tapNode(U00, "S1");
    plan.activities.forEach((activity, index) =>
      solveActivity(activity, true, index === plan.activities.length - 1),
    );
    exitResult();
    await flushAsync();

    const started = lesson.events.find((event) => event.name === "episode_lesson_started");
    const finished = lesson.events.find((event) => event.name === "episode_lesson_finished");
    expect(started).toMatchObject({ episodeId: U00, unitKey: "S1" });
    expect(finished).toMatchObject({ episodeId: U00, unitKey: "S1" });
    expect(JSON.stringify([...events, ...lesson.events])).not.toContain('"episodeId":"tutorial"');
  });
});

describe("TU10 설문", () => {
  test("TU10. u00을 끝내면 설문이 Tutorial로 서고 답하면 episode_survey_answered가 u00 id로 난다", async () => {
    const { events, rpcs } = await bootTutorialApp({
      progressSeed: { catalogProgress: { [U00]: keysWithout("RP") } },
    });
    const plan = finalPlanOf(U00, 0);

    tapNode(U00, "RP");
    solveFinalTurns(plan.turns);
    useBannerClock();
    exitResult();
    readAllCuts(4);
    await settleFake();
    passBanner();
    await flushAsync();

    await vi.waitFor(() => {
      const back = screen.queryByTestId("journey-stat-modal-back");
      if (back !== null) {
        act(() => {
          fireEvent.tap(back.querySelector('[data-testid="ui-lynx-round-button"]') as Element, {});
        });
      }
      expect(screen.getByTestId("episode-survey-options")).toBeInTheDocument();
    });
    expect(document.body.textContent ?? "").toContain("Tutorial");

    fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-5"), {});
    await flushAsync();

    expect(events).toContainEqual({ name: "episode_survey_answered", episodeId: U00, rating: "5" });
    const submitted = rpcs.filter((rpc) => rpc.name === "submit_feedback");
    expect(submitted).toHaveLength(1);
    expect((submitted[0]?.body["p_context"] as Record<string, string>)["episodeId"]).toBe(U00);
  });
});

describe("TK4 티켓", () => {
  const chip = () => screen.getByTestId("top-bar-tickets");

  /** 레슨을 시작하고 열렸으면 나가기 확인으로 맵에 돌아옵니다. */
  function startAndLeave(episodeId: string, key: string): boolean {
    tapNode(episodeId, key);
    const exit =
      screen.queryByTestId("learning-run-header-exit") ??
      screen.queryByTestId("learning-shell-exit");
    if (exit === null) return false;
    fireEvent.tap(exit, {});
    tapButtonIn("ui-lynx-dialog-action-leave");
    return true;
  }

  test("TK4. 티켓 3장인 새 사용자가 u00 레슨을 네 번 시작해도 막히지 않고 칩은 3 그대로이며 tickets_ran_out은 0이다", async () => {
    const { events } = await bootTutorialApp({
      progressSeed: { catalogProgress: tutorialCoverDoneProgress() },
    });
    expect(chip()).toHaveTextContent("3");

    for (let attempt = 0; attempt < 4; attempt += 1) {
      expect(startAndLeave(U00, "S1")).toBe(true);
      await flushAsync();
    }

    expect(chip()).toHaveTextContent("3");
    expect(screen.queryAllByTestId("out-of-tickets").length).toBe(0);
    expect(events.filter((event) => event.name === "tickets_ran_out")).toEqual([]);
  });

  test("TK4. u00을 끝낸 뒤 u01 레슨을 시작하면 티켓 한 장이 나가 칩이 2다", async () => {
    await bootTutorialApp({
      progressSeed: { catalogProgress: { ...tutorialDoneProgress(), [U01]: ["intro"] } },
    });
    expect(chip()).toHaveTextContent("3");
    expect(status(U01, "S1")).toBe("available");

    expect(startAndLeave(U01, "S1")).toBe(true);
    await flushAsync();

    expect(chip()).toHaveTextContent("2");
    expect(node(U01, "S1")).toBeInTheDocument();
  });
});
