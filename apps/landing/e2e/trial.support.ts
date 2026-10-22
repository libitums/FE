import { expect, type Locator, type Page } from "@playwright/test";
import { supabaseUrl } from "../playwright.config";

// 체험판 e2e의 공용 도구입니다. 음성 버킷(테스트 주소)은 가로채 작은 소리나 404로 답하고,
// 말하기는 init 스크립트로 가짜 인식기를 넣거나 두 생성자를 지웁니다. 화면 값은 페이지 JSON(`trial-model`)에서 읽습니다
// — u00 글을 테스트에 옮겨 적지 않습니다.

export const contentHost = new URL(supabaseUrl).hostname;

/** 화면 모델 중 테스트가 쓰는 부분만(계약 `TrialModel`과 같은 이름). */
export interface TrialText {
  ko: string;
  roman: string | null;
  en: string | null;
}
export interface TrialCut {
  index: number;
  text: TrialText;
  imageUrl: string | null;
  audioUrl: string | null;
}
export interface TrialTurn {
  line: TrialText;
  tiles: { ko: string }[];
  accepted: string[];
  counterpartAudioUrl: string | null;
  replyAudioUrl: string | null;
}
export interface TrialModel {
  prologue: TrialCut[];
  epilogue: TrialCut[];
  vocab: {
    word: TrialText;
    audioUrl: string | null;
    exampleAudioUrl: string | null;
  };
  imageMatch: {
    prompt: string;
    options: TrialText[];
    answerIndex: number;
    audioUrl: string | null;
  };
  replySelect: {
    line: TrialText;
    options: TrialText[];
    answerIndex: number;
    audioUrl: string | null;
  };
  culture: { title: TrialText; imageUrl: string | null };
  roleplay: { imageUrl: string | null; turns: TrialTurn[] };
}
export interface TrialCopy {
  great: string;
  notQuite: string;
  noticeDenied: string;
  noticeUnsupported: string;
  teaserTitle: string;
  preregDone: string;
  preregFailed: string;
  preregRetry: string;
}

export async function pageData(page: Page): Promise<{ model: TrialModel; copy: TrialCopy }> {
  const text = await page.getByTestId("trial-model").textContent();
  return JSON.parse(text ?? "") as { model: TrialModel; copy: TrialCopy };
}

/** 말하기 정답(인식기가 내는 꼴 — 부호 없음). 받아 주는 답 `accepted[0]`에서 부호를 뺀 글입니다. */
export const spoken = (turn: TrialTurn) =>
  (turn.accepted[0] ?? "")
    .replace(/[.,!?~…。、]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const squash = (text: string) => text.replace(/[\s.,!?~…。、]/g, "");

/** 놓으면 정답이 되는 타일 자리 차례(보이는 순서 기준) — 순열을 다 대 봅니다(타일은 셋 이하). */
export function correctTiles(turn: TrialTurn): number[] {
  const goal = new Set(turn.accepted.map(squash));
  const indices = turn.tiles.map((_, index) => index);
  const permutations = (rest: number[]): number[][] =>
    rest.length <= 1
      ? [rest]
      : rest.flatMap((head) =>
          permutations(rest.filter((other) => other !== head)).map((tail) => [head, ...tail]),
        );
  const found = permutations(indices).find((order) =>
    goal.has(squash(order.map((index) => turn.tiles[index]?.ko ?? "").join(""))),
  );
  if (!found) throw new Error(`정답 타일 차례를 찾지 못함: ${turn.accepted.join(" / ")}`);
  return found;
}

/** 오답 차례(타일 둘 이상일 때) — 정답을 뒤집습니다. */
export const wrongTiles = (turn: TrialTurn) => [...correctTiles(turn)].reverse();

export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

export const root = (page: Page) => page.getByTestId("trial");
/** 지금 보이는 그 test-id 요소들. */
export const shown = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });

/** 체험판을 엽니다 — 표지 없이 컷 1(prologue)이 첫 화면입니다. */
export async function openTrial(page: Page, path = "/try/") {
  await page.goto(path, { waitUntil: "load" });
  await expect(root(page)).toHaveAttribute("data-step", "prologue");
  await expect(root(page)).toHaveAttribute("data-motion", /^(reduced|full)$/);
}

export async function expectStep(page: Page, step: string) {
  await expect(root(page)).toHaveAttribute("data-step", step);
  await expect(page.getByTestId(`trial-step-${step}`)).toBeVisible();
}

export async function tap(page: Page, id: string, index?: number) {
  const target =
    index === undefined
      ? shown(page, id)
      : shown(page, id).and(
          page.locator(`[data-option-index="${index}"], [data-tile-index="${index}"]`),
        );
  await expect(target).toHaveCount(1);
  await target.click();
}

export const imageLoaded = (image: Locator) =>
  expect
    .poll(() =>
      image.evaluate(
        (node) =>
          (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0,
      ),
    )
    .toBe(true);

/** 컷 묶음을 끝까지 넘깁니다(움직임 줄이기 기준 — 탭 한 번에 컷 하나). */
export async function passCuts(page: Page, step: "prologue" | "epilogue", cuts: number) {
  for (let cut = 0; cut < cuts; cut += 1) {
    await expect(root(page)).toHaveAttribute("data-step", step);
    await tap(page, "trial-cuts-next");
  }
}

/** 컷 1(첫 탭이 시작) → 컷 → 단어 → 고르기 둘(정답) → 문화(뒤집기) → 롤플레이 첫 턴. `cutsDone`만큼은 이미 넘긴 것으로 친다. */
export async function playToRoleplay(page: Page, model: TrialModel, cutsDone = 0) {
  await passCuts(page, "prologue", model.prologue.length - cutsDone);
  await expectStep(page, "vocab");
  await tap(page, "trial-vocab-next");
  await expectStep(page, "image-match");
  await tap(page, "trial-option", model.imageMatch.answerIndex);
  await tap(page, "trial-choice-next");
  await expectStep(page, "reply-select");
  await tap(page, "trial-option", model.replySelect.answerIndex);
  await tap(page, "trial-choice-next");
  await expectStep(page, "culture");
  await tap(page, "trial-culture-flip");
  await tap(page, "trial-culture-next");
  await expectStep(page, "roleplay");
}

/** Episode clear — 배너를 눌러 예고로, 예고 Next로 완료로. */
export async function passClear(page: Page) {
  await expectStep(page, "clear");
  const banner = shown(page, "trial-clear-banner");
  // 유지 시간(1.6초)이 먼저 지나 예고로 넘어갔을 수도 있다 — 배너가 보일 때만 누른다.
  if ((await banner.count()) > 0) await banner.click().catch(() => undefined);
  await expect(page.getByTestId("trial-step-clear")).toHaveAttribute("data-phase", "teaser");
  await tap(page, "trial-clear-next");
  await expectStep(page, "complete");
}

/** 엔딩 컷 넷 → Episode clear → 완료. */
export async function passEnding(page: Page, model: TrialModel) {
  await passCuts(page, "epilogue", model.epilogue.length);
  await passClear(page);
}

export async function tileTurn(page: Page, order: readonly number[]) {
  for (const index of order) await tap(page, "trial-tile", index);
  await tap(page, "trial-turn-check");
}

export const turnShown = (page: Page) => shown(page, "trial-turn");

/** 타일로 세 턴을 맞히고 Episode clear를 지나 완료 화면까지(말하기 없는 브라우저 기준). */
export async function playToComplete(page: Page, model: TrialModel, cutsDone = 0) {
  await playToRoleplay(page, model, cutsDone);
  for (const turn of model.roleplay.turns) {
    await tileTurn(page, correctTiles(turn));
    await tap(page, "trial-turn-next");
  }
  await passEnding(page, model);
}
