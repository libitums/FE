import { useEffect, useRef, useState } from "@lynx-js/react";
import { color } from "@libitums/design-tokens";

import {
  compareHandwritingTrace,
  guideHandwritingTrace,
  isHandwritingTraceAvailable,
} from "../../lib/handwriting-trace";
import type { HandwritingTraceRequest } from "../../lib/handwriting-trace";
import type { Stroke } from "../../lib/handwriting-recognition";
import { storyTracePassed } from "./catalog-story-final";

// 이야기 파이널 따라 쓰기의 한 음절 — 호스트가 구운 안내 그림 · 획 · 견주기입니다. 안내 그림과 견주기가 **같은 요청**을
// 씁니다(손글씨 탐침 `use-probe-trace`와 같은 까닭: 화면이 보여 주는 안내와 채점되는 안내가 갈리지 않게).

/** 쓰기 칸 크기(point) — CSS 상자와 같은 수여야 좌표가 어긋나지 않습니다(`catalog-story-final-screen.css`). */
export const storyTraceSurface = { width: 220, height: 220 } as const;
/** 탐침(300 칸 · 14 펜 · 팽창 6)을 칸 크기 비율로 줄인 값입니다. */
export const storyTraceStrokeWidth = 11;
const TRACE_FONT_SIZE = storyTraceSurface.width * 0.8;
const TRACE_TOLERANCE = 5;

function requestOf(glyph: string, strokes: readonly Stroke[]): HandwritingTraceRequest {
  return {
    width: storyTraceSurface.width,
    height: storyTraceSurface.height,
    strokeWidth: storyTraceStrokeWidth,
    strokes,
    glyph,
    fontSize: TRACE_FONT_SIZE,
    // 그 그림을 어느 글꼴로 구울지입니다. Android에는 없어 호스트가 시스템 sans-serif로 갑니다.
    fontName: "AppleSDGothicNeo-Regular",
    tolerance: TRACE_TOLERANCE,
    // 어두운 판 위의 흐린 안내입니다 — 색의 정본은 토큰입니다(ADR-0014 D1).
    guideColor: color.gray[800],
  };
}

export type StoryTrace = {
  /** 호스트가 구운 안내 PNG(base64). 호스트가 없거나 아직이면 `null`. */
  readonly guideImage: string | null;
  readonly strokes: readonly Stroke[];
  /** 호스트가 없으면 거짓 — 연습으로 두고 막지 않습니다. */
  readonly graded: boolean;
  readonly grading: boolean;
  readonly addStroke: (stroke: Stroke) => void;
  readonly redo: () => void;
  /** 지금 획을 견주어 통과 여부를 한 번 돌려줍니다. 견주는 동안 다시 불러도 무시합니다. */
  readonly grade: (onGraded: (passed: boolean) => void) => void;
};

/** `slot`은 음절 자리(턴 · 순번)입니다 — 같은 글자가 이어져도 자리가 바뀌면 칸을 비웁니다. */
export function useStoryTrace(glyph: string, slot: string): StoryTrace {
  const [guideImage, setGuideImage] = useState<string | null>(null);
  const [strokes, setStrokes] = useState<readonly Stroke[]>([]);
  const [grading, setGrading] = useState(false);
  // 음절이 바뀐 뒤 늦게 온 옛 답(안내 · 견주기)을 버립니다.
  const generation = useRef(0);

  useEffect(() => {
    generation.current += 1;
    const requestedAt = generation.current;
    setStrokes([]);
    setGuideImage(null);
    setGrading(false);
    guideHandwritingTrace(requestOf(glyph, []), (outcome) => {
      if (requestedAt !== generation.current) return;
      setGuideImage(outcome.status === "rendered" ? outcome.image : null);
    });
    // 음절이 바뀌거나 화면이 사라지면 세대를 올려, 늦게 온 안내 · 견주기 답이 상태를 바꾸지 않게 합니다.
    return () => {
      generation.current += 1;
    };
  }, [glyph, slot]);

  const grade = (onGraded: (passed: boolean) => void) => {
    if (grading) return;
    const requestedAt = generation.current;
    setGrading(true);
    const requested = compareHandwritingTrace(requestOf(glyph, strokes), (outcome) => {
      setGrading(false);
      if (requestedAt !== generation.current) return;
      onGraded(storyTracePassed(outcome));
    });
    if (requested === "unavailable") {
      setGrading(false);
      onGraded(storyTracePassed({ status: "unavailable" }));
    }
  };

  return {
    guideImage,
    strokes,
    graded: isHandwritingTraceAvailable(),
    grading,
    addStroke: (stroke) => setStrokes((current) => [...current, stroke]),
    redo: () => setStrokes([]),
    grade,
  };
}
