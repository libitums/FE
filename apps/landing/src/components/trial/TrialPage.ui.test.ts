import { beforeAll, describe, expect, it } from "vitest";

import { trialEn } from "../../i18n/trial-copy";
import { trialKo } from "../../i18n/trial-ko";
import type { Language } from "../../site";
import { formatCopy } from "../../trial/trial-copy-format";
import type { TrialModel } from "../../trial/trial-model.contract";
import { u00TrialModel } from "../../trial/trial.test-support";
import { jsonLd, render } from "../render.support";
import type { TrialCopy } from "./trial-components.contract";
import TrialPage from "./TrialPage.astro";
import {
  SCRIPT_COPY_KEYS,
  TRIAL_PAGE_TEST_IDS,
  accessibleNameOf,
  allByTestId,
  expectButton,
  expectStepHeading,
  isHiddenWithin,
  langOf,
  oneByTestId,
  textOf,
} from "./trial-ui.support";

const copies: Record<Language, TrialCopy> = { en: trialEn, ko: trialKo };

describe("TrialPage", () => {
  let model: TrialModel;
  const pages: Partial<Record<Language, Document>> = {};
  const page = (language: Language) => pages[language] as Document;

  beforeAll(async () => {
    model = u00TrialModel();
    for (const language of ["en", "ko"] as const) {
      const { document } = await render(TrialPage, {
        props: { language, model, measurementId: "" },
      });
      pages[language] = document;
    }
  });

  describe("UT1 처음 HTML(en)", () => {
    it("루트 trial은 data-step=start · lang=en", () => {
      const root = oneByTestId(page("en"), "trial");
      expect(root.tagName).toBe("MAIN");
      expect(root.id).toBe("main");
      expect(root.getAttribute("data-step")).toBe("start");
      expect(root.getAttribute("lang")).toBe("en");
    });

    it("단계 section 열 개 — start만 보이고 나머지는 hidden, 각자 제목을 가리킨다", () => {
      const root = oneByTestId(page("en"), "trial");
      const steps = [...root.querySelectorAll('[data-testid^="trial-step-"]')];
      expect(steps.map((step) => step.getAttribute("data-testid"))).toEqual([
        "trial-step-start",
        "trial-step-prologue",
        "trial-step-vocab",
        "trial-step-image-match",
        "trial-step-reply-select",
        "trial-step-culture",
        "trial-step-roleplay",
        "trial-step-epilogue",
        "trial-step-complete",
      ]);
      for (const step of steps) {
        const id = step.getAttribute("data-testid");
        expect(step.hasAttribute("hidden"), `${id} hidden`).toBe(id !== "trial-step-start");
        expectStepHeading(step);
      }
    });

    it("trial-model JSON = { model, copy } — copy는 스크립트 문구 18키", () => {
      const script = oneByTestId(page("en"), "trial-model");
      expect(script.tagName).toBe("SCRIPT");
      expect(script.id).toBe("trial-model");
      expect(script.getAttribute("type")).toBe("application/json");
      const data = JSON.parse(script.textContent ?? "") as { model: unknown; copy: object };
      expect(Object.keys(data).sort()).toEqual(["copy", "model"]);
      expect(data.model).toEqual(JSON.parse(JSON.stringify(model)));
      expect(Object.keys(data.copy).sort()).toEqual([...SCRIPT_COPY_KEYS].sort());
      expect(data.copy).toEqual(Object.fromEntries(SCRIPT_COPY_KEYS.map((k) => [k, trialEn[k]])));
    });

    it("trial-live는 aria-live=polite", () => {
      const live = oneByTestId(page("en"), "trial-live");
      expect(live.getAttribute("aria-live")).toBe("polite");
    });

    it("noscript 안내 + 홈 링크", () => {
      const noscript = oneByTestId(page("en"), "trial-noscript");
      expect(noscript.tagName).toBe("NOSCRIPT");
      // JSDOM은 스크립트를 끈 채 파싱하므로 noscript 안이 요소로 읽힌다.
      expect(noscript.textContent).toContain(trialEn.noscript);
      const home = [...noscript.querySelectorAll("a")].map((a) => a.getAttribute("href"));
      expect(home).toContain("/");
    });

    it("색인 안 함 — robots noindex · canonical · hreflang · JSON-LD 없음", () => {
      const document = page("en");
      const robots = document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "";
      expect(robots).toMatch(/\bnoindex\b/);
      expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(0);
      expect(document.querySelectorAll('link[rel="alternate"][hreflang]')).toHaveLength(0);
      expect(jsonLd(document)).toEqual([]);
    });
  });

  describe("UT11 ko 페이지", () => {
    it("루트 lang=ko · html lang=ko", () => {
      const document = page("ko");
      expect(document.documentElement.getAttribute("lang")).toBe("ko");
      expect(oneByTestId(document, "trial").getAttribute("lang")).toBe("ko");
    });

    it("UI 글이 trialKo 값이다", () => {
      const document = page("ko");
      const turns = model.roleplay.turns.length;
      expect(oneByTestId(document, "trial-exit").getAttribute("aria-label")).toBe(trialKo.exit);
      expect(oneByTestId(document, "trial-progress").getAttribute("aria-label")).toBe(
        trialKo.progressLabel,
      );
      expect(textOf(oneByTestId(document, "trial-start-title"))).toBe(trialKo.startTitle);
      expect(textOf(oneByTestId(document, "trial-start-button"))).toBe(trialKo.start);
      expect(textOf(oneByTestId(document, "trial-vocab-next"))).toBe(trialKo.gotIt);
      expect(textOf(allByTestId(document, "trial-turn-progress")[0])).toBe(
        formatCopy(trialKo.lineProgress, { ordinal: "1", total: String(turns) }),
      );
      expect(allByTestId(document, "trial-store-state").map(textOf)).toEqual([
        trialKo.storeSoon,
        trialKo.storeSoon,
      ]);
      expect(textOf(oneByTestId(document, "trial-complete-home"))).toBe(trialKo.backHome);
      const data = JSON.parse(oneByTestId(document, "trial-model").textContent ?? "") as {
        copy: Record<string, string>;
      };
      expect(data.copy).toEqual(Object.fromEntries(SCRIPT_COPY_KEYS.map((k) => [k, trialKo[k]])));
    });

    it("영어 번역 줄은 lang=en, 한국어 학습 글은 lang=ko", () => {
      const document = page("ko");
      const english = [
        ...allByTestId(document, "trial-cut-translation"),
        oneByTestId(document, "trial-vocab-meaning"),
      ];
      expect(english.length).toBeGreaterThan(0);
      for (const line of english) expect(langOf(line), textOf(line)).toBe("en");
      const korean = [
        ...allByTestId(document, "trial-cut-line"),
        ...allByTestId(document, "trial-turn-line"),
        oneByTestId(document, "trial-vocab-word"),
        oneByTestId(document, "trial-reply-select-line"),
      ];
      for (const line of korean) expect(langOf(line), textOf(line)).toBe("ko");
    });

    it("학습 글은 en 페이지와 같다(AC5)", () => {
      const learning = (document: Document) =>
        (
          [
            "trial-cut-line",
            "trial-cut-roman",
            "trial-cut-translation",
            "trial-vocab-word",
            "trial-vocab-roman",
            "trial-vocab-meaning",
            "trial-option",
            "trial-turn-line",
            "trial-tile",
            "trial-culture-title",
            "trial-culture-body",
          ] as const
        ).map((id) => allByTestId(document, id).map(textOf));
      const en = learning(page("en"));
      expect(en.every((texts) => texts.length > 0)).toBe(true);
      expect(learning(page("ko"))).toEqual(en);
    });

    it.each(["en", "ko"] as const)("다음 · 계속 버튼 글이 그 언어 문구다 (%s)", (language) => {
      const t = copies[language];
      const document = page(language);
      for (const next of allByTestId(document, "trial-cuts-next")) {
        expect([t.next, t.continue]).toContain(textOf(next));
      }
      expect(textOf(oneByTestId(document, "trial-culture-next"))).not.toBe("");
      expect(allByTestId(document, "trial-turn-speak").map(accessibleNameOf)).toEqual(
        model.roleplay.turns.map(() => t.speak),
      );
    });
  });

  describe("UT12 버튼 · test-id", () => {
    it.each(["en", "ko"] as const)(
      "모든 button은 type=button · 접근 이름 있음 (%s)",
      (language) => {
        const buttons = [...page(language).querySelectorAll("button")];
        expect(buttons.length).toBeGreaterThan(20);
        for (const button of buttons) expectButton(button);
      },
    );

    it("페이지의 test-id는 전부 계약 안이고, 계약의 체험판 test-id가 전부 나온다", () => {
      const document = page("en");
      const known = new Set<string>(TRIAL_PAGE_TEST_IDS);
      const used = new Set(
        [...document.querySelectorAll("[data-testid]")].map((e) => e.getAttribute("data-testid")),
      );
      expect([...used].filter((id) => !known.has(id ?? ""))).toEqual([]);
      expect(TRIAL_PAGE_TEST_IDS.filter((id) => !used.has(id))).toEqual([]);
    });

    it("처음엔 start 장면의 버튼만 보인다", () => {
      const root = oneByTestId(page("en"), "trial");
      const visible = [...root.querySelectorAll("button")].filter(
        (button) => !isHiddenWithin(button, root),
      );
      expect(visible.map((b) => b.getAttribute("data-testid"))).toEqual(["trial-start-button"]);
    });
  });
});
