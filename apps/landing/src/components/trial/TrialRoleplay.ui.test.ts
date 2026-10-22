import { beforeAll, describe, expect, it } from "vitest";

import { trialEn } from "../../i18n/trial-copy";
import { trialKo } from "../../i18n/trial-ko";
import { formatCopy } from "../../trial/trial-copy-format";
import type { TrialModel } from "../../trial/trial-model.contract";
import { u00TrialModel } from "../../trial/trial.test-support";
import { render } from "../render.support";
import TrialRoleplay from "./TrialRoleplay.astro";
import {
  allByTestId,
  expectButton,
  expectStepHeading,
  isHiddenWithin,
  langOf,
  oneByTestId,
  textOf,
} from "./trial-ui.support";

const t = trialEn;

describe("UT9 TrialRoleplay", () => {
  let model: TrialModel;
  let document: Document;

  beforeAll(async () => {
    model = u00TrialModel();
    ({ document } = await render(TrialRoleplay, {
      props: {
        t,
        counterpartName: model.counterpartName,
        imageUrl: model.roleplay.imageUrl,
        turns: model.roleplay.turns,
        collects: false,
      },
    }));
  });

  const turns = () => allByTestId(document, "trial-turn");
  const firstTurn = () => turns()[0] as Element;

  it("section hidden · 제목 · 장면 그림", () => {
    const section = oneByTestId(document, "trial-step-roleplay");
    expect(section.hasAttribute("hidden")).toBe(true);
    expectStepHeading(section);
    const image = oneByTestId(section, "trial-roleplay-image");
    expect(image.getAttribute("src")).toBe(model.roleplay.imageUrl);
  });

  it("턴 3 · 첫째만 보임 · data-turn-index · speech · ready", () => {
    const found = turns();
    expect(found.map((turn) => turn.tagName)).toEqual(["ARTICLE", "ARTICLE", "ARTICLE"]);
    expect(found.map((turn) => turn.getAttribute("data-turn-index"))).toEqual(["0", "1", "2"]);
    expect(found.map((turn) => turn.hasAttribute("hidden"))).toEqual([false, true, true]);
    for (const turn of found) {
      expect(turn.getAttribute("data-mode")).toBe("speech");
      expect(turn.getAttribute("data-phase")).toBe("ready");
    }
  });

  it("진행 「Line n of 3」 · 상대 이름 · 상대 줄 lang=ko · 다시 듣기", () => {
    turns().forEach((turn, index) => {
      const source = model.roleplay.turns[index];
      expect(textOf(oneByTestId(turn, "trial-turn-progress"))).toBe(
        formatCopy(t.lineProgress, { ordinal: String(index + 1), total: "3" }),
      );
      expect(textOf(oneByTestId(turn, "trial-turn-counterpart"))).toBe("승무원");
      const line = oneByTestId(turn, "trial-turn-line");
      expect(langOf(line)).toBe("ko");
      expect(line.textContent).toContain(source?.line.ko ?? "-");
      expectButton(oneByTestId(turn, "trial-turn-replay"));
    });
    expect(textOf(oneByTestId(firstTurn(), "trial-turn-progress"))).toBe("Line 1 of 3");
  });

  it("말하기 조작 보임 — speak(aria-pressed 없음) · 힌트 버튼 · Can't speak now", () => {
    const turn = firstTurn();
    const speak = oneByTestId(turn, "trial-turn-speak");
    expectButton(speak);
    expect(speak.hasAttribute("aria-pressed")).toBe(false);
    const hintButton = oneByTestId(turn, "trial-turn-hint-button");
    expectButton(hintButton, t.showHint);
    const cantSpeak = oneByTestId(turn, "trial-turn-cant-speak");
    expectButton(cantSpeak, t.cantSpeak);
    for (const element of [speak, hintButton, cantSpeak]) {
      expect(isHiddenWithin(element, turn), element.getAttribute("data-testid") ?? "").toBe(false);
    }
  });

  it("처음 숨김 — 힌트 · 다시 · 다음 · 대답 · 안내", () => {
    const turn = firstTurn();
    const hiddenIds = [
      "trial-turn-hint",
      "trial-turn-retry",
      "trial-turn-next",
      "trial-turn-reply",
      "trial-turn-notice",
    ] as const;
    for (const id of hiddenIds) {
      expect(isHiddenWithin(oneByTestId(turn, id), turn), id).toBe(true);
    }
    expectButton(oneByTestId(turn, "trial-turn-retry"), t.tryAgain);
    expectButton(oneByTestId(turn, "trial-turn-next"));
    const reply = oneByTestId(turn, "trial-turn-reply");
    for (const id of ["trial-turn-verdict", "trial-turn-heard", "trial-turn-answer"] as const) {
      oneByTestId(reply, id);
    }
  });

  it("타일 — 섞인 순서 · aria-pressed=false · Check aria-disabled=true", () => {
    turns().forEach((turn, index) => {
      const source = model.roleplay.turns[index];
      const box = oneByTestId(turn, "trial-turn-tiles");
      const tiles = allByTestId(box, "trial-tile");
      expect(tiles.map(textOf)).toEqual(source?.tiles.map((tile) => tile.ko));
      tiles.forEach((tile, tileIndex) => {
        expectButton(tile);
        expect(tile.getAttribute("data-tile-index")).toBe(String(tileIndex));
        expect(tile.getAttribute("aria-pressed")).toBe("false");
        expect(langOf(tile)).toBe("ko");
      });
      oneByTestId(turn, "trial-turn-composed");
      const check = oneByTestId(turn, "trial-turn-check");
      expectButton(check, t.check);
      expect(check.getAttribute("aria-disabled")).toBe("true");
    });
    expect(allByTestId(firstTurn(), "trial-tile").map(textOf)).toEqual([
      "네,",
      "처음이에요!",
      "안녕하세요!",
    ]);
  });

  it("음성 주소가 없으면 상대 줄 다시 듣기를 그리지 않는다", async () => {
    const silent = u00TrialModel("");
    const { document: quiet } = await render(TrialRoleplay, {
      props: {
        t,
        counterpartName: silent.counterpartName,
        imageUrl: silent.roleplay.imageUrl,
        turns: silent.roleplay.turns,
        collects: false,
      },
    });
    expect(allByTestId(quiet, "trial-turn")).toHaveLength(3);
    expect(allByTestId(quiet, "trial-turn-line")).toHaveLength(3);
    expect(allByTestId(quiet, "trial-turn-replay")).toHaveLength(0);
  });
});

describe("UT-S1 수집 안내 줄", () => {
  const renderWith = async (collects: boolean, copy = t) => {
    const model = u00TrialModel();
    const { document } = await render(TrialRoleplay, {
      props: {
        t: copy,
        counterpartName: model.counterpartName,
        imageUrl: model.roleplay.imageUrl,
        turns: model.roleplay.turns,
        collects,
      },
    });
    return document;
  };

  it.each([
    ["en", trialEn],
    ["ko", trialKo],
  ] as const)(
    "collects면 턴마다 마이크 아래 안내 한 줄 = speechSaved, 마이크가 그 줄을 가리킨다 (%s)",
    async (_language, copy) => {
      const document = await renderWith(true, copy);
      const turns = allByTestId(document, "trial-turn");
      expect(turns).toHaveLength(3);
      turns.forEach((turn, index) => {
        const saved = oneByTestId(turn, "trial-turn-saved");
        expect(saved.tagName).toBe("P");
        expect(textOf(saved)).toBe(copy.speechSaved);
        expect(saved.id).toBe(`trial-turn-saved-${index}`);
        expect(saved.closest(".trial-speak")).not.toBeNull();
        expect(saved.hasAttribute("aria-live")).toBe(false);
        const mic = oneByTestId(turn, "trial-turn-speak");
        expect(mic.getAttribute("aria-describedby")).toBe(saved.id);
        // 마이크 다음에 온다(읽는 차례 · 보이는 차례)
        // DOCUMENT_POSITION_FOLLOWING = 4(Node 전역은 렌더 환경에 없다)
        expect(mic.compareDocumentPosition(saved) & 4).toBe(4);
      });
    },
  );

  it("collects가 아니면 줄도 describedby도 없다", async () => {
    const document = await renderWith(false);
    expect(allByTestId(document, "trial-turn-saved")).toHaveLength(0);
    for (const mic of allByTestId(document, "trial-turn-speak")) {
      expect(mic.hasAttribute("aria-describedby")).toBe(false);
    }
  });
});
