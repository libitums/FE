// 체험판 정적 마크업의 접근성 — 섞인 언어의 lang(W2)과 이름을 바꾸는 버튼의 pressed 상태(W3).
// 실제 페이지 문맥(루트 lang)을 보려고 TrialPage 전체를 en · ko로 굽습니다.

import { beforeAll, describe, expect, it } from "vitest";

import { trialEn } from "../../i18n/trial-copy";
import { trialKo } from "../../i18n/trial-ko";
import type { Language } from "../../site";
import type { TrialModel } from "../../trial/trial-model.contract";
import { u00TrialModel } from "../../trial/trial.test-support";
import { render } from "../render.support";
import type { TrialCopy } from "./trial-components.contract";
import TrialPage from "./TrialPage.astro";
import { accessibleNameOf, allByTestId, langOf, oneByTestId, textOf } from "./trial-ui.support";

const copies: Record<Language, TrialCopy> = { en: trialEn, ko: trialKo };
const clean = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();

/** 요소 안 글 조각과 그 조각의 가장 가까운 lang. */
function fragmentsOf(element: Element): { text: string; lang: string | null }[] {
  const walker = element.ownerDocument.createTreeWalker(element, 4 /* SHOW_TEXT */);
  const found: { text: string; lang: string | null }[] = [];
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = clean(node.textContent);
    if (text !== "") found.push({ text, lang: langOf(node.parentElement as Element) });
  }
  return found;
}

/** 그 글을 온전히 담은 조각의 lang이 기대값이고, 그 조각에 `other` 글이 섞이지 않는다. */
function expectPhraseLang(
  element: Element,
  phrase: string,
  lang: string,
  label: string,
  other?: string,
): void {
  const fragments = fragmentsOf(element);
  const holder = fragments.find((fragment) => fragment.text.includes(clean(phrase)));
  expect(holder, `${label}: 「${phrase}」 조각 — ${JSON.stringify(fragments)}`).toBeDefined();
  expect(holder?.lang, `${label}: 「${phrase}」의 lang — ${JSON.stringify(fragments)}`).toBe(lang);
  if (other !== undefined && other !== "") {
    expect(
      holder?.text.includes(clean(other)),
      `${label}: 「${phrase}」 조각에 「${other}」가 섞이지 않는다 — ${JSON.stringify(fragments)}`,
    ).toBe(false);
  }
}

/** 문구 틀의 `{answer}` 앞 글(예: 「Answer:」). */
const prefixOf = (template: string) => clean(template.split("{answer}")[0]);

describe("체험판 마크업 접근성(a11y r01)", () => {
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

  describe("W2 섞인 언어의 lang(en 페이지)", () => {
    it("롤플레이 정답 공개 「Answer: …」 — 한국어 정답은 lang=ko, 앞말은 lang=en", () => {
      const turns = allByTestId(page("en"), "trial-turn");
      expect(turns).toHaveLength(3);
      turns.forEach((turn, index) => {
        const answer = model.roleplay.turns[index]?.accepted[0] ?? "-";
        const node = oneByTestId(turn, "trial-turn-answer");
        const prefix = prefixOf(trialEn.correctAnswer);
        expectPhraseLang(node, answer, "ko", `턴 ${index + 1} 정답`, prefix);
        expectPhraseLang(node, prefix, "en", `턴 ${index + 1} 앞말`, answer);
      });
    });

    it("고르기 두 화면의 정답 공개(.trial-reveal) — 한국어 정답은 lang=ko", () => {
      const cases = [
        ["trial-step-image-match", model.imageMatch],
        ["trial-step-reply-select", model.replySelect],
      ] as const;
      for (const [id, item] of cases) {
        const reveal = oneByTestId(page("en"), id).querySelector(".trial-reveal");
        expect(reveal, `${id} 정답 공개 줄`).not.toBeNull();
        const answer = item.options[item.answerIndex]?.ko ?? "-";
        const prefix = prefixOf(trialEn.correctAnswer);
        expectPhraseLang(reveal as Element, answer, "ko", `${id} 정답`, prefix);
        expectPhraseLang(reveal as Element, prefix, "en", `${id} 앞말`, answer);
      }
    });

    it("타일 자리표시 — 영어 자리표시 글이 lang=ko 요소의 생성 내용(::before)으로 들어가지 않는다", () => {
      for (const turn of allByTestId(page("en"), "trial-turn")) {
        const composed = oneByTestId(turn, "trial-turn-composed");
        const viaAttribute =
          composed.getAttribute("data-placeholder") === trialEn.replyEmpty ? composed : null;
        if (viaAttribute !== null) {
          expect(langOf(viaAttribute), "data-placeholder를 단 대답 칸의 lang(비었을 때)").toBe(
            "en",
          );
          continue;
        }
        // 실제 요소로 그린다면 그 요소가 lang=en 이어야 한다.
        const tilesArea = composed.parentElement as Element;
        const holder = [...tilesArea.querySelectorAll("*")].find(
          (element) => textOf(element) === trialEn.replyEmpty,
        );
        expect(holder, "자리표시 글을 담은 실제 요소").toBeDefined();
        expect(langOf(holder as Element)).toBe("en");
      }
    });

    it("문화 카드 그림 — 한국어 alt를 쓰면 lang=ko, 아니면 빈 alt", () => {
      const image = oneByTestId(page("en"), "trial-culture-image");
      const alt = image.getAttribute("alt") ?? "";
      if (alt !== "") {
        expect(langOf(image), `한국어 alt 「${alt}」를 단 img의 lang`).toBe("ko");
      } else {
        expect(alt).toBe("");
      }
    });

    it("ko 페이지 자리표시 · 정답은 한국어 그대로(가드)", () => {
      const turn = allByTestId(page("ko"), "trial-turn")[0] as Element;
      expect(langOf(oneByTestId(turn, "trial-turn-composed"))).toBe("ko");
      const answer = model.roleplay.turns[0]?.accepted[0] ?? "-";
      expectPhraseLang(oneByTestId(turn, "trial-turn-answer"), answer, "ko", "ko 정답");
    });
  });

  describe("W3 이름을 동작으로 바꾸는 버튼은 aria-pressed를 쓰지 않는다", () => {
    for (const language of ["en", "ko"] as const) {
      it(`${language}: 문화 카드 뒤집기 — pressed 없음 · 이름 = cultureFlipToBack`, () => {
        const flip = oneByTestId(page(language), "trial-culture-flip");
        expect(flip.hasAttribute("aria-pressed"), "aria-pressed 없음").toBe(false);
        expect(accessibleNameOf(flip)).toBe(copies[language].cultureFlipToBack);
      });

      it(`${language}: 마이크 — 턴마다 pressed 없음 · 이름 = speak`, () => {
        for (const speak of allByTestId(page(language), "trial-turn-speak")) {
          expect(speak.hasAttribute("aria-pressed"), "aria-pressed 없음").toBe(false);
          expect(accessibleNameOf(speak)).toBe(copies[language].speak);
        }
      });
    }

    it("이름이 고정인 토글(보기 · 타일)은 aria-pressed를 그대로 쓴다(가드)", () => {
      const doc = page("en");
      for (const option of allByTestId(doc, "trial-option"))
        expect(option.getAttribute("aria-pressed")).toBe("false");
      for (const tile of allByTestId(doc, "trial-tile"))
        expect(tile.getAttribute("aria-pressed")).toBe("false");
    });
  });
});
