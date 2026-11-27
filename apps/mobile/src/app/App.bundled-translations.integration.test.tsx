import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { uiLanguageStorageKey } from "../lib/ui-language";
import { resetApp } from "./test-helpers/episode-format-harness";
import { tutorialDoneProgress } from "./test-helpers/progress-seed";
import { bootTutorialApp } from "./test-helpers/tutorial-boot";

// `integration` 계층(2026-11-27 사용자 지시 — 「내장 번역표에 없는 언어도 넣어 줘야지」): 번역 파일을 하나도 받지 않은 기기(오프라인 첫 실행)에서
// 앱 언어가 zh-TW · th · my면 내장 본문의 표만으로 롤플레이 목록 제목과 대화의 뜻이 그 언어로 서는가를 App 한 트리로 봅니다. 다른 흐름 테스트는
// 고정본을 쓰므로, 여기서는 실제 내장본으로 되돌립니다. 대역은 경계뿐입니다(저장소 · fetch 연결 실패).
vi.mock("../lib/episode-bundled", async () => vi.importActual("../lib/episode-bundled"));

afterEach(resetApp);

const U01 = "u01-water";
const body = JSON.parse(
  readFileSync(resolve(process.cwd(), "content/episodes/u01-water.json"), "utf8"),
) as {
  readonly title_en: string;
  readonly translations: Readonly<Record<string, Readonly<Record<string, string>>>>;
};
const tableOf = (language: string): Readonly<Record<string, string>> =>
  body.translations[language] ?? {};

const id = (testId: string) => screen.getByTestId(testId);

async function openFirstTurn(language: string): Promise<void> {
  await bootTutorialApp({
    offline: true,
    progressSeed: {
      catalogProgress: {
        ...tutorialDoneProgress(),
        [U01]: ["intro", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT", "RP"],
      },
    },
    preStore: { [uiLanguageStorageKey]: language },
  });
  fireEvent.tap(id("ui-lynx-bottom-navigator-item-roleplay"), {});
}

test.each(["zh-TW", "th", "my"])(
  "IBT1. %s — 받은 번역 파일 없이도 롤플레이 목록 제목 · 대화의 상대 줄 뜻 · 내 문장 뜻이 그 언어다",
  async (language) => {
    const table = tableOf(language);
    const title = table[body.title_en] ?? "(없음)";
    const line = table["Would you like a bag?"] ?? "(없음)";
    const meaning = table["No, I'm fine."] ?? "(없음)";

    await openFirstTurn(language);
    expect(id(`roleplay-list-item-title-story-${U01}`)).toHaveTextContent(title);

    fireEvent.tap(id(`roleplay-list-item-story-${U01}`), {});
    await act(async () => {
      fireEvent.tap(within(id("roleplay-preview-start")).getByTestId("ui-lynx-button"), {});
    });
    for (let i = 0; i < 30 && screen.queryByTestId("roleplay-talk-screen") === null; i += 1) {
      fireEvent.tap(id("catalog-cover-screen-next"), {});
    }
    expect(id("roleplay-talk-line")).toHaveTextContent(line);
    expect(id("roleplay-talk-meaning")).toHaveTextContent(meaning);
  },
);
