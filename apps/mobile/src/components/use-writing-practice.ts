// 쓰기 문항 하나를 음절씩 쓰는 흐름에 **호스트를 잇는** 훅입니다 — 안내 그림을 받아 오고,
// 견주기를 요청하고, 판정을 알립니다. 흐름 자체(국면 · 전이)는 `lib/writing-session.ts`의
// 리듀서가 지고, 여기는 그것을 부수효과와 잇기만 합니다.
//
// 쓰기 학습형과 최종 테스트의 쓰기 문항이 함께 씁니다(ADR-0008). 버튼의 라벨과 자리는 화면마다
// 달라(학습 껍데기의 한국어 버튼 · 최종 테스트의 영어 버튼) 여기서 정하지 않습니다 — 화면은
// `check` · `next`가 있는지로 버튼을 세우고 라벨은 스스로 붙입니다.

import { useUiCopy } from "../lib/ui-copy";
import { useEffect, useReducer, useRef, useState } from "@lynx-js/react";

import { announce } from "../lib/accessibility";
import type { AnswerResult } from "../lib/answer-result";
import type { Stroke } from "../lib/handwriting-recognition";
import { compareHandwritingTrace, guideHandwritingTrace } from "../lib/handwriting-trace";
import { writingCanvasGeometries, writingTraceRequest } from "../lib/writing-canvas";
import type { WritingCanvasSize } from "../lib/writing-canvas";
import { judgeWriting, writingQuestionResult } from "../lib/writing-judge";
import {
  currentWritingSyllable,
  initialWritingSessionState,
  isLastWritingSyllable,
  writingSessionReducer,
  type WritingQuestion,
  type WritingSessionState,
} from "../lib/writing-session";

/**
 * 캔버스에 까는 안내입니다.
 *
 * - `image` — 호스트가 구운 PNG(base64)입니다. **보는 것과 재는 것이 같은 픽셀**입니다.
 * - `text` — 호스트가 없거나(Explorer · 테스트) 그림을 못 구웠을 때 Lynx `<text>`로 대신 보이는
 *   글자입니다. 호스트가 재는 글자와 자리가 어긋날 수 있지만(탐침에서 22pt), 그때는 어차피
 *   판정을 건너뛰므로 어긋남이 점수로 새지 않습니다.
 * - `hidden` — 그림을 기다리는 중이거나 판정이 선 뒤입니다. 기다리는 동안 글자를 먼저 세우지
 *   않는 것은, 그 위에 쓰기 시작한 획이 그림이 온 뒤 다른 자리를 보고 채점되기 때문입니다.
 */
export type WritingGuideView =
  | { readonly kind: "hidden" }
  | { readonly kind: "image"; readonly image: string }
  | { readonly kind: "text" };

/** 캔버스 위 작은 버튼 하나입니다 — `지우기` 또는 `다시 쓰기`. */
export type WritingEraseControl = { readonly label: string; readonly run: () => void };

export type WritingPractice = {
  readonly state: WritingSessionState;
  /** 지금 쓸 음절입니다. 문항을 다 썼으면 `null`입니다. */
  readonly syllable: string | null;
  readonly guide: WritingGuideView;
  readonly addStroke: (stroke: Stroke) => void;
  /** 쓰는 중에 획이 있으면 `지우기`, 틀린 판정 뒤면 `다시 쓰기`, 아니면 없습니다. */
  readonly erase: WritingEraseControl | null;
  /** 견주기입니다. 쓰는 중이고 획이 있을 때만 있습니다 — 빈 판은 잴 것이 없습니다. */
  readonly check: (() => void) | null;
  /** 다음 음절로 갑니다. 판정 · 잴 수 없음 뒤에만 있습니다. 마지막 음절이면 문항을 끝냅니다. */
  readonly next: (() => void) | null;
};

export type WritingPracticeOptions = {
  readonly question: WritingQuestion;
  readonly size: WritingCanvasSize;
  /**
   * 마지막 음절의 `다음`에서 한 번 불립니다. 잰 음절이 하나도 없었으면 `null`이고, 그 문항은
   * 결과에 싣지 않습니다(`writingQuestionResult`).
   */
  readonly onQuestionDone: (result: AnswerResult | null) => void;
};

type GuideEntry = { readonly glyph: string; readonly view: WritingGuideView };

export function useWritingPractice({
  question,
  size,
  onQuestionDone,
}: WritingPracticeOptions): WritingPractice {
  const copy = useUiCopy();
  const [state, dispatch] = useReducer(writingSessionReducer, initialWritingSessionState);
  const [guideEntry, setGuideEntry] = useState<GuideEntry | null>(null);
  const geometry = writingCanvasGeometries[size];
  const syllable = currentWritingSyllable(state, question);

  // 화면이 떠 있는가 · 몇째 요청인가입니다. 견주기는 호스트를 거쳐 늦게 돌아오므로, 떠난 뒤에
  // 온 답이 상태를 바꾸지 않게 막고, 견주기를 두 번 누르면 앞 요청의 답을 버립니다.
  //
  // ⚠ 훅의 상태는 **문항 하나의 것**입니다. 문항이 바뀌면 부르는 쪽이 `key`로 훅을 새로
  // 세웁니다 — 같은 훅에 다른 문항을 넘기면 음절 순번이 앞 문항의 것으로 남습니다.
  const mounted = useRef(true);
  const generation = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // 음절이 바뀔 때마다 안내 그림을 한 번 굽습니다. 다시 쓰기에서는 같은 음절이라 다시 굽지
  // 않습니다.
  useEffect(() => {
    if (syllable === null) {
      return undefined;
    }
    let live = true;
    const requested = guideHandwritingTrace(
      writingTraceRequest(geometry, syllable, []),
      (outcome) => {
        if (!live) {
          return;
        }
        setGuideEntry({
          glyph: syllable,
          view:
            outcome.status === "rendered"
              ? { kind: "image", image: outcome.image }
              : { kind: "text" },
        });
      },
    );
    if (requested === "unavailable") {
      setGuideEntry({ glyph: syllable, view: { kind: "text" } });
    }
    return () => {
      live = false;
    };
    // `geometry`는 `size`에서 나오는 고정 표의 값이라 `size`로 충분합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syllable, size]);

  // 판정이 서면 채점 결과를 한 번 읽습니다 — 말하기 · 최종 테스트와 같은 문구입니다.
  useEffect(() => {
    if (state.phase === "judged" && state.verdict !== null) {
      announce(copy.common.resultAnnouncement(state.verdict));
    }
  }, [state.syllableIndex, state.phase, state.verdict]);

  // 판정이 나면 안내를 걷습니다 — 쓴 획만 남아 「내가 쓴 글자」를 보게 합니다(디자인의 완성
  // 상태). 다시 쓰기로 돌아오면 같은 그림이 다시 섭니다.
  const guide: WritingGuideView =
    syllable === null ||
    state.phase === "judged" ||
    state.phase === "unmeasurable" ||
    guideEntry === null ||
    guideEntry.glyph !== syllable
      ? { kind: "hidden" }
      : guideEntry.view;

  const check = () => {
    if (syllable === null) {
      return;
    }
    const requestedAt = ++generation.current;
    const strokes = state.strokes;
    dispatch({ type: "check" });
    const requested = compareHandwritingTrace(
      writingTraceRequest(geometry, syllable, strokes),
      (outcome) => {
        if (!mounted.current || requestedAt !== generation.current) {
          return;
        }
        dispatch({ type: "judgement", judgement: judgeWriting(outcome, question.passCriterion) });
      },
    );
    // 모듈이 없으면 콜백이 오지 않습니다 — 판정을 건너뛰고 넘어갈 수 있게 잴 수 없음으로 둡니다.
    if (requested === "unavailable") {
      dispatch({ type: "judgement", judgement: { kind: "unmeasurable" } });
    }
  };

  const next = () => {
    const results = state.verdict === null ? state.results : [...state.results, state.verdict];
    const last = isLastWritingSyllable(state, question);
    dispatch({ type: "next" });
    if (last) {
      onQuestionDone(writingQuestionResult(results));
    }
  };

  const erase: WritingEraseControl | null =
    state.phase === "writing" && state.strokes.length > 0
      ? { label: copy.writing.erase, run: () => dispatch({ type: "clear" }) }
      : state.phase === "judged" && state.verdict === "incorrect"
        ? { label: copy.writing.rewrite, run: () => dispatch({ type: "retry" }) }
        : null;

  return {
    state,
    syllable,
    guide,
    addStroke: (stroke) => dispatch({ type: "stroke", stroke }),
    erase,
    check:
      syllable !== null && state.phase === "writing" && state.strokes.length > 0 ? check : null,
    next:
      syllable !== null && (state.phase === "judged" || state.phase === "unmeasurable")
        ? next
        : null,
  };
}
