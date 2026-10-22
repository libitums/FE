// 체험판 접근성 결선 통합 — 롤플레이 안의 초점 이동(C1), 거부 뒤 새 턴 낭독(W1), 섞인 언어의 lang(W2),
// 동작 이름을 바꾸는 버튼의 pressed 상태(W3). 실제 TrialPage 마크업 + initTrial + 가짜 접점.
// 키보드로 누르는 상황을 흉내 내려고 누르기 전에 그 버튼에 초점을 둡니다(JSDOM의 click은 초점을 옮기지 않음).

import { afterEach, describe, expect, it } from "vitest";

import type { TrialTestId } from "../components/trial/trial-components.contract";
import {
  accessibleNameOf,
  allByTestId,
  isHiddenWithin,
  langOf,
} from "../components/trial/trial-ui.support";
import { formatCopy } from "./trial-copy-format";
import {
  type Harness,
  failed,
  heard,
  mountTrial,
  playToRoleplay,
  settle,
  shown,
  unmount,
} from "./trial-flow.test-support";
import { SPEECH_CORRECT, TILES_CORRECT } from "./trial.test-support";

let h: Harness | undefined;
let stopRecording: (() => void) | undefined;
afterEach(() => {
  stopRecording?.();
  stopRecording = undefined;
  unmount(h);
  h = undefined;
});

const clean = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();

/** 키보드 누르기 — 보이는 그 버튼에 초점을 두고 누른 뒤 움직임이 끝날 때까지 시계를 돌립니다. */
async function press(harness: Harness, id: TrialTestId, index?: number): Promise<HTMLElement> {
  const target =
    index === undefined
      ? shown(harness, id)
      : (allByTestId(harness.root, id).find(
          (element) =>
            !isHiddenWithin(element, harness.root) &&
            (element.getAttribute("data-option-index") ??
              element.getAttribute("data-tile-index")) === String(index),
        ) as HTMLElement | undefined);
  expect(target, `누를 ${id}[${index ?? ""}]`).toBeDefined();
  const element = target as HTMLElement;
  element.focus();
  expect(harness.doc.activeElement, `${id}에 초점을 둘 수 있다`).toBe(element);
  element.click();
  await settle();
  return element;
}

const currentTurn = (harness: Harness) => shown(harness, "trial-turn");
const firstTile = (harness: Harness) =>
  currentTurn(harness).querySelector<HTMLElement>(
    '[data-testid="trial-tile"][data-tile-index="0"]',
  );

/** 시작 → 컷 → 단어 → 고르기 둘(정답) → 문화 카드 앞면까지. */
async function playToCulture(harness: Harness): Promise<void> {
  await press(harness, "trial-start-button");
  for (let cut = 0; cut < harness.data.model.prologue.length; cut += 1)
    await press(harness, "trial-cuts-next");
  await press(harness, "trial-vocab-next");
  await press(harness, "trial-option", harness.data.model.imageMatch.answerIndex);
  await press(harness, "trial-choice-next");
  await press(harness, "trial-option", harness.data.model.replySelect.answerIndex);
  await press(harness, "trial-choice-next");
}

function describeActive(harness: Harness): string {
  const active = harness.doc.activeElement;
  if (active === null) return "null";
  const id = active.getAttribute("data-testid") ?? active.tagName.toLowerCase();
  const hidden = isHiddenWithin(active, harness.root) ? " (숨겨짐)" : "";
  return `${id}${hidden}`;
}

/** 초점이 body가 아니고, 보이는 기대 대상에 있다. */
function expectFocusOn(harness: Harness, expected: HTMLElement | null, label: string): void {
  expect(expected, `${label}: 기대 대상이 있다`).not.toBeNull();
  const target = expected as HTMLElement;
  expect(isHiddenWithin(target, harness.root), `${label}: 기대 대상이 보인다`).toBe(false);
  const active = harness.doc.activeElement;
  expect(active, `${label}: 초점이 body로 빠지지 않는다`).not.toBe(harness.doc.body);
  expect(
    active === null ? true : isHiddenWithin(active, harness.root),
    `${label}: 초점 요소가 숨겨지지 않는다 — 지금 ${describeActive(harness)}`,
  ).toBe(false);
  expect(
    active,
    `${label}: 초점 = ${target.getAttribute("data-testid")} — 지금 ${describeActive(harness)}`,
  ).toBe(target);
}

describe("C1 롤플레이 안 초점 — 누른 버튼이 숨으면 상태별 대상으로", () => {
  it("Show hint → 펼친 힌트 글(trial-turn-hint, tabindex=-1)", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    await press(h, "trial-turn-hint-button");
    const hint = shown(h, "trial-turn-hint");
    expect(hint.getAttribute("tabindex")).toBe("-1");
    expectFocusOn(h, hint, "Show hint");
  });

  it("Speak → 정답 판정 → Continue(trial-turn-next)", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    h.speech.queue(heard(SPEECH_CORRECT[0] ?? ""));
    await press(h, "trial-turn-speak");
    expect(shown(h, "trial-turn-reply").getAttribute("data-verdict")).toBe("correct");
    expectFocusOn(h, shown(h, "trial-turn-next"), "Speak 정답");
  });

  it("Speak → 오답 판정 → Try again(trial-turn-retry)", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    h.speech.queue(heard("바나나"));
    await press(h, "trial-turn-speak");
    expect(shown(h, "trial-turn-reply").getAttribute("data-verdict")).toBe("incorrect");
    expectFocusOn(h, shown(h, "trial-turn-retry"), "Speak 오답");
  });

  it("Speak → 못 들음(no-speech) → Try again", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    h.speech.queue(failed("no-speech"));
    await press(h, "trial-turn-speak");
    expectFocusOn(h, shown(h, "trial-turn-retry"), "Speak no-speech");
  });

  it("Try again → ready → Speak(trial-turn-speak)", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    h.speech.queue(heard("바나나"));
    await press(h, "trial-turn-speak");
    await press(h, "trial-turn-retry");
    expect(currentTurn(h).getAttribute("data-phase")).toBe("ready");
    expectFocusOn(h, shown(h, "trial-turn-speak"), "Try again");
  });

  it("Can't speak now(ready) → 첫 타일", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    await press(h, "trial-turn-cant-speak");
    expect(currentTurn(h).getAttribute("data-mode")).toBe("tiles");
    expectFocusOn(h, firstTile(h), "Can't speak now");
  });

  it("듣는 중 Can't speak now → 첫 타일", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    await press(h, "trial-turn-speak");
    expect(currentTurn(h).getAttribute("data-phase")).toBe("listening");
    await press(h, "trial-turn-cant-speak");
    expect(currentTurn(h).getAttribute("data-mode")).toBe("tiles");
    expectFocusOn(h, firstTile(h), "듣는 중 Can't speak now");
  });

  it("마이크 거부(denied) → 같은 턴 타일의 첫 타일", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    h.speech.queue(failed("denied"));
    await press(h, "trial-turn-speak");
    expect(currentTurn(h).getAttribute("data-mode")).toBe("tiles");
    expectFocusOn(h, firstTile(h), "mic denied");
  });

  it("말하기 불가(unavailable) → 첫 타일", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    h.speech.queue(failed("unavailable"));
    await press(h, "trial-turn-speak");
    expect(currentTurn(h).getAttribute("data-mode")).toBe("tiles");
    expectFocusOn(h, firstTile(h), "unavailable");
  });

  it("Check(정답 · 오답) → Continue(trial-turn-next)", async () => {
    h = await mountTrial({ speech: "unsupported" });
    await playToRoleplay(h);
    for (const index of TILES_CORRECT[0] ?? []) await press(h, "trial-tile", index);
    await press(h, "trial-turn-check");
    expect(shown(h, "trial-turn-reply").getAttribute("data-verdict")).toBe("correct");
    expectFocusOn(h, shown(h, "trial-turn-next"), "Check 정답");
    await press(h, "trial-turn-next");
    for (const index of [0, 1]) await press(h, "trial-tile", index);
    await press(h, "trial-turn-check");
    expect(shown(h, "trial-turn-reply").getAttribute("data-verdict")).toBe("incorrect");
    expectFocusOn(h, shown(h, "trial-turn-next"), "Check 오답");
  });

  it("Continue → 다음 턴 → 새 턴의 진행 글(trial-turn-progress, tabindex=-1)", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    for (const index of [0, 1]) {
      h.speech.queue(heard(SPEECH_CORRECT[index] ?? ""));
      await press(h, "trial-turn-speak");
      await press(h, "trial-turn-next");
      const turn = currentTurn(h);
      expect(turn.getAttribute("data-turn-index")).toBe(String(index + 1));
      const progress = shown(h, "trial-turn-progress");
      expect(turn.contains(progress)).toBe(true);
      expect(progress.getAttribute("tabindex")).toBe("-1");
      expectFocusOn(h, progress, `턴 ${index + 2}로 Continue`);
    }
  });

  it("거부 뒤 타일 턴의 Continue → 다음 턴 진행 글", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    h.speech.queue(failed("denied"));
    await press(h, "trial-turn-speak");
    for (const index of TILES_CORRECT[0] ?? []) await press(h, "trial-tile", index);
    await press(h, "trial-turn-check");
    await press(h, "trial-turn-next");
    expect(currentTurn(h).getAttribute("data-turn-index")).toBe("1");
    expectFocusOn(h, shown(h, "trial-turn-progress"), "denied 뒤 턴 2로 Continue");
  });
});

/** `trial-live`에 쓰인 글을 차례대로 기록합니다(같은 글 연속은 한 번). */
function recordLive(harness: Harness): string[] {
  const live = shown(harness, "trial-live");
  const log: string[] = [];
  const push = () => {
    const text = clean(live.textContent);
    if (text !== "" && log.at(-1) !== text) log.push(text);
  };
  const observer = new (harness.window as unknown as typeof globalThis).MutationObserver(push);
  observer.observe(live, { childList: true, characterData: true, subtree: true });
  stopRecording = () => observer.disconnect();
  return log;
}

/** 기록 중 그 글이 처음 나온 (낭독 차례, 글 안 위치). 없으면 null. */
function firstSpoken(
  log: readonly string[],
  from: number,
  phrase: string,
): [number, number] | null {
  for (let at = from; at < log.length; at += 1) {
    const position = (log[at] ?? "").indexOf(phrase);
    if (position >= 0) return [at, position];
  }
  return null;
}

const before = (a: [number, number], b: [number, number]) =>
  a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);

describe("W1 안내가 있는 새 턴도 상대 대사를 낭독한다", () => {
  for (const language of ["en", "ko"] as const) {
    it(`${language}: 턴 1 거부 → 턴 2 · 턴 3에 들어서면 그 턴 진행 · 상대 대사 · 번역이 낭독되고, 안내는 그 앞에 이미 낭독됐다`, async () => {
      h = await mountTrial({ language });
      await playToRoleplay(h);
      const log = recordLive(h);
      h.speech.queue(failed("denied"));
      await press(h, "trial-turn-speak");
      const notice = h.data.copy.noticeDenied;
      const noticeAt = firstSpoken(log, 0, notice);
      expect(noticeAt, `거부 안내 낭독 — 기록: ${JSON.stringify(log)}`).not.toBeNull();
      for (const index of [0, 1]) {
        for (const tile of TILES_CORRECT[index] ?? []) await press(h, "trial-tile", tile);
        await press(h, "trial-turn-check");
        const from = log.length;
        await press(h, "trial-turn-next");
        const item = h.data.model.roleplay.turns[index + 1];
        const progress = formatCopy(h.data.copy.lineProgress, {
          ordinal: String(index + 2),
          total: String(h.data.model.roleplay.turns.length),
        });
        const entered = log.slice(from);
        const label = `턴 ${index + 2} 진입 낭독 ${JSON.stringify(entered)}`;
        const lineAt = firstSpoken(log, from, clean(item?.line.ko));
        expect(lineAt, `${label}에 상대 대사`).not.toBeNull();
        expect(firstSpoken(log, from, progress), `${label}에 진행`).not.toBeNull();
        expect(firstSpoken(log, from, clean(item?.line.en)), `${label}에 번역`).not.toBeNull();
        expect(before(noticeAt as [number, number], lineAt as [number, number])).toBe(true);
        // 같은 턴 낭독 안에 안내를 다시 붙인다면 대사 뒤에 온다.
        const repeated = firstSpoken(log, from, notice);
        if (repeated !== null) {
          expect(before(lineAt as [number, number], repeated), `${label}: 대사 → 안내 차례`).toBe(
            true,
          );
        }
      }
    });
  }

  it("처음부터 말하기 미지원 → 롤플레이 첫 턴 낭독 = 상대 대사 뒤에 미지원 안내", async () => {
    h = await mountTrial({ speech: "unsupported" });
    await playToCulture(h);
    const log = recordLive(h);
    await press(h, "trial-culture-next");
    expect(h.root.getAttribute("data-step")).toBe("roleplay");
    const item = h.data.model.roleplay.turns[0];
    const label = `롤플레이 진입 낭독 ${JSON.stringify(log)}`;
    const lineAt = firstSpoken(log, 0, clean(item.line.ko));
    const noticeAt = firstSpoken(log, 0, h.data.copy.noticeUnsupported);
    expect(lineAt, `${label}에 상대 대사`).not.toBeNull();
    expect(noticeAt, `${label}에 미지원 안내`).not.toBeNull();
    expect(before(lineAt as [number, number], noticeAt as [number, number])).toBe(true);
  });
});

/** 요소 안 글 조각과 그 조각의 가장 가까운 lang. */
function fragmentsOf(element: Element): { text: string; lang: string | null }[] {
  const doc = element.ownerDocument;
  const walker = doc.createTreeWalker(element, 4 /* NodeFilter.SHOW_TEXT */);
  const found: { text: string; lang: string | null }[] = [];
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = clean(node.textContent);
    if (text !== "") found.push({ text, lang: langOf(node.parentElement as Element) });
  }
  return found;
}

/** 그 글을 담은 조각의 lang — 조각 하나가 그 글을 온전히 담고, 그 조각에 다른 언어 글이 섞이지 않아야 합니다. */
function expectPhraseLang(
  element: Element,
  phrase: string,
  lang: string,
  label: string,
  other?: string,
): void {
  const fragments = fragmentsOf(element);
  const holder = fragments.find((fragment) => fragment.text.includes(clean(phrase)));
  expect(
    holder,
    `${label}: 「${phrase}」를 담은 조각 — 조각들 ${JSON.stringify(fragments)}`,
  ).toBeDefined();
  expect(holder?.lang, `${label}: 「${phrase}」의 lang — 조각들 ${JSON.stringify(fragments)}`).toBe(
    lang,
  );
  if (other !== undefined) {
    expect(
      holder?.text.includes(clean(other)),
      `${label}: 「${phrase}」 조각에 「${other}」가 섞이지 않는다`,
    ).toBe(false);
  }
}

describe("W2 섞인 언어의 lang — live region · 들은 말", () => {
  it("en: 컷 낭독의 한국어 대사 lang=ko · 번역 lang=en", async () => {
    h = await mountTrial();
    await press(h, "trial-start-button");
    await press(h, "trial-cuts-next");
    const cut = h.data.model.prologue[1];
    const live = shown(h, "trial-live");
    expectPhraseLang(live, cut.text.ko, "ko", "컷 2 낭독", cut.text.en ?? undefined);
    if (cut.text.en !== null) expectPhraseLang(live, cut.text.en, "en", "컷 2 낭독", cut.text.ko);
  });

  it("en: 고르기 오답 낭독 「Answer: …」의 한국어 정답 lang=ko", async () => {
    h = await mountTrial();
    await press(h, "trial-start-button");
    for (let cut = 0; cut < 6; cut += 1) await press(h, "trial-cuts-next");
    await press(h, "trial-vocab-next");
    const { imageMatch } = h.data.model;
    await press(h, "trial-option", imageMatch.answerIndex === 0 ? 1 : 0);
    const answer = imageMatch.options[imageMatch.answerIndex]?.ko ?? "-";
    expectPhraseLang(shown(h, "trial-live"), answer, "ko", "고르기 오답 낭독", "Answer");
  });

  it("en: 새 턴 낭독의 상대 대사 lang=ko · 번역 lang=en", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    const item = h.data.model.roleplay.turns[0];
    const live = shown(h, "trial-live");
    expectPhraseLang(live, item.line.ko, "ko", "턴 1 낭독", item.line.en ?? undefined);
    if (item.line.en !== null)
      expectPhraseLang(live, item.line.en, "en", "턴 1 낭독", item.line.ko);
  });

  it("ko: 새 턴 낭독의 영어 번역 lang=en · 상대 대사 lang=ko", async () => {
    h = await mountTrial({ language: "ko" });
    await playToRoleplay(h);
    const item = h.data.model.roleplay.turns[0];
    const live = shown(h, "trial-live");
    if (item.line.en !== null)
      expectPhraseLang(live, item.line.en, "en", "턴 1 낭독", item.line.ko);
    expectPhraseLang(live, item.line.ko, "ko", "턴 1 낭독", item.line.en ?? undefined);
  });

  it("en: 말하기 판정 낭독 「You said: 바나나」의 들은 말 · 정답 lang=ko, 앞말 lang=en", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    h.speech.queue(heard("바나나"));
    await press(h, "trial-turn-speak");
    const live = shown(h, "trial-live");
    expectPhraseLang(live, "바나나", "ko", "판정 낭독", "You said");
    expectPhraseLang(live, "You said", "en", "판정 낭독", "바나나");
    const answer = h.data.model.roleplay.turns[0].accepted[0] ?? "-";
    expectPhraseLang(live, answer, "ko", "판정 낭독", "Answer");
  });

  it("en: 못 들었을 때 trial-turn-heard의 영어 문구는 lang=en", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    h.speech.queue(failed("no-speech"));
    await press(h, "trial-turn-speak");
    const heardNode = shown(h, "trial-turn-heard");
    expect(clean(heardNode.textContent)).toBe(h.data.copy.heardNothing);
    expectPhraseLang(heardNode, h.data.copy.heardNothing, "en", "못 들음");
  });

  it("en: 들은 말이 있으면 trial-turn-heard는 lang=ko 그대로", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    h.speech.queue(heard("바나나"));
    await press(h, "trial-turn-speak");
    expectPhraseLang(shown(h, "trial-turn-heard"), "바나나", "ko", "들은 말");
  });
});

/** 이름을 동작으로 바꾸는 버튼 — aria-pressed가 없고 이름이 다음 동작이다. */
function expectActionNamed(element: HTMLElement, name: string, label: string): void {
  expect(element.hasAttribute("aria-pressed"), `${label}: aria-pressed 없음`).toBe(false);
  expect(accessibleNameOf(element), `${label}: 이름`).toBe(name);
}

describe("W3 이름을 바꾸는 버튼은 aria-pressed를 쓰지 않는다(design §3.5 쪽으로 통일)", () => {
  for (const language of ["en", "ko"] as const) {
    it(`${language}: 문화 카드 뒤집기 — 앞 「cultureFlipToBack」 ⇄ 뒤 「cultureFlipToFront」, pressed 없음`, async () => {
      h = await mountTrial({ language });
      await playToCulture(h);
      const { copy } = h.data;
      expectActionNamed(shown(h, "trial-culture-flip"), copy.cultureFlipToBack, "앞면");
      await press(h, "trial-culture-flip");
      expect(shown(h, "trial-culture-card").getAttribute("data-face")).toBe("back");
      expectActionNamed(shown(h, "trial-culture-flip"), copy.cultureFlipToFront, "뒷면");
      await press(h, "trial-culture-flip");
      expect(shown(h, "trial-culture-card").getAttribute("data-face")).toBe("front");
      expectActionNamed(shown(h, "trial-culture-flip"), copy.cultureFlipToBack, "다시 앞면");
    });

    it(`${language}: 마이크 — ready 「speak」 ⇄ 듣는 중 「stop」, pressed 없음`, async () => {
      h = await mountTrial({ language });
      await playToRoleplay(h);
      const { copy } = h.data;
      expectActionNamed(shown(h, "trial-turn-speak"), copy.speak, "ready");
      await press(h, "trial-turn-speak");
      expect(currentTurn(h).getAttribute("data-phase")).toBe("listening");
      expectActionNamed(shown(h, "trial-turn-speak"), copy.stop, "듣는 중");
      h.speech.resolvePending(heard("바나나"));
      await settle();
      await press(h, "trial-turn-retry");
      expectActionNamed(shown(h, "trial-turn-speak"), copy.speak, "다시 ready");
    });
  }
});
