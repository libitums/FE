// 전이 하나에 `trial-live`(polite)로 읽을 글입니다 — 컷 낭독 · 고르기 판정 · 듣는 중 · 말하기 판정 · 안내.
// 컷 글은 이미 그려진 마크업(화자 · 지문 · 대사 · 번역)에서 읽습니다. 읽을 것이 없으면 null.
// 글은 lang을 단 조각들로 내고, `renderLive`가 조각마다 span으로 그립니다.

import type { TrialScriptCopy } from "../components/trial/trial-components.contract";
import { formatCopy } from "./trial-copy-format";
import { allByTestId, byTestId } from "./trial-dom-util";
import { heardTextOf, noticeCopyOf } from "./trial-dom-turn";
import type { TrialState } from "./trial-machine.contract";
import type { TrialModel } from "./trial-model.contract";

const clean = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();

/** 낭독 글 한 조각 — 섞인 언어를 제 lang으로 읽히게 조각마다 lang을 둡니다(null = 페이지 언어). */
export type LiveFragment = { readonly text: string; readonly lang: string | null };

const KO = "ko";
const page = (text: string): LiveFragment => ({ text, lang: null });
const joined = (parts: readonly LiveFragment[]) => parts.filter((part) => clean(part.text) !== "");
const nonEmpty = (parts: LiveFragment[]) => (parts.length > 0 ? parts : null);

/** 문구 틀의 `{name}` 자리에 다른 언어 값을 끼운 조각들. */
function slotted(template: string, name: string, value: string, lang: string | null) {
  const mark = `{${name}}`;
  const at = template.indexOf(mark);
  if (at < 0) return [page(template)];
  return [
    page(template.slice(0, at)),
    { text: value, lang },
    page(template.slice(at + mark.length)),
  ];
}

/** 그려진 요소의 글과 그 요소의 lang. */
function fromElement(element: Element | null | undefined): LiveFragment {
  if (element === null || element === undefined) return page("");
  return {
    text: clean(element.textContent),
    lang: element.closest("[lang]")?.getAttribute("lang") ?? null,
  };
}

function cutAnnouncement(root: HTMLElement, state: TrialState): LiveFragment[] | null {
  const section = byTestId(root, `trial-step-${state.step}`);
  const cut = section === null ? undefined : allByTestId(section, "trial-cut")[state.cutIndex];
  if (cut === undefined) return null;
  return nonEmpty(
    joined([
      fromElement(byTestId(cut, "trial-cut-speaker")),
      fromElement(cut.querySelector(".trial-dialog__aside")),
      fromElement(byTestId(cut, "trial-cut-line")),
      fromElement(byTestId(cut, "trial-cut-translation")),
    ]),
  );
}

function choiceAnnouncement(
  model: TrialModel,
  copy: TrialScriptCopy,
  prev: TrialState,
  next: TrialState,
): LiveFragment[] | null {
  const { verdict } = next.choice;
  if (prev.choice.verdict !== null || verdict === null) return null;
  if (verdict === "correct") return [page(copy.choiceCorrect)];
  const item = next.step === "image-match" ? model.imageMatch : model.replySelect;
  const answer = item.options[item.answerIndex]?.ko ?? "";
  return joined([page(copy.choiceWrong), ...slotted(copy.correctAnswer, "answer", answer, KO)]);
}

function turnAnnouncement(
  model: TrialModel,
  copy: TrialScriptCopy,
  prev: TrialState,
  next: TrialState,
): LiveFragment[] | null {
  const before = prev.roleplay.turn;
  const turn = next.roleplay.turn;
  const item = model.roleplay.turns[turn.index];
  if (item === undefined) return null;
  const newTurn = prev.step !== "roleplay" || before.index !== turn.index;
  if (turn.phase === "judged" && before.phase !== "judged") {
    const heard = heardTextOf(model, copy, next);
    const nothing = turn.mode === "speech" && turn.heard === "";
    const said = nothing ? [page(heard)] : slotted(copy.youSaid, "heard", heard, KO);
    const answer =
      turn.verdict === "incorrect"
        ? slotted(copy.correctAnswer, "answer", item.accepted[0], KO)
        : [];
    return joined([
      page(turn.verdict === "correct" ? copy.great : copy.notQuite),
      ...said,
      ...answer,
    ]);
  }
  if (turn.phase === "listening" && before.phase !== "listening") return [page(copy.listening)];
  const notice = noticeCopyOf(copy, turn.notice);
  // 안내는 처음 나올 때만 읽고, 새 턴이면 그 턴의 진행 · 대사 · 번역 뒤에 붙입니다.
  const freshNotice = notice !== "" && (prev.step !== "roleplay" || before.notice !== turn.notice);
  if (newTurn) {
    const progress = formatCopy(copy.lineProgress, {
      ordinal: String(turn.index + 1),
      total: String(model.roleplay.turns.length),
    });
    return joined([
      page(progress),
      { text: item.line.ko, lang: KO },
      { text: item.line.en ?? "", lang: "en" },
      page(freshNotice ? notice : ""),
    ]);
  }
  return freshNotice ? [page(notice)] : null;
}

export function announcementOf(
  root: HTMLElement,
  model: TrialModel,
  copy: TrialScriptCopy,
  prev: TrialState,
  next: TrialState,
): LiveFragment[] | null {
  switch (next.step) {
    case "prologue":
    case "epilogue":
      return prev.step !== next.step || prev.cutIndex !== next.cutIndex
        ? cutAnnouncement(root, next)
        : null;
    case "image-match":
    case "reply-select":
      return choiceAnnouncement(model, copy, prev, next);
    case "roleplay":
      return turnAnnouncement(model, copy, prev, next);
    default:
      return null;
  }
}

/** 낭독 조각들을 live region에 그립니다 — 조각마다 span(lang), 사이는 빈칸. */
export function renderLive(live: HTMLElement, fragments: readonly LiveFragment[]): void {
  const doc = live.ownerDocument;
  const nodes: Node[] = [];
  fragments.forEach((fragment, position) => {
    if (position > 0) nodes.push(doc.createTextNode(" "));
    const span = doc.createElement("span");
    if (fragment.lang !== null) span.setAttribute("lang", fragment.lang);
    span.textContent = clean(fragment.text);
    nodes.push(span);
  });
  live.replaceChildren(...nodes);
}
