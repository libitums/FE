import { useEffect, useRef, useState } from "@lynx-js/react";
import { color } from "@libitums/design-tokens";

import {
  probeStrokeWidth,
  probeSurfaceSize,
  probeTraceFontSize,
  probeTraceGlyph,
  probeTraceTolerance,
} from "./handwriting-probe";
import { compareHandwritingTrace, guideHandwritingTrace } from "../../lib/handwriting-trace";
import type { HandwritingTraceOutcome, HandwritingTraceRequest } from "../../lib/handwriting-trace";
import type { Stroke } from "../../lib/handwriting-recognition";

// 탐침의 **따라 쓰기** 관심사만 듭니다 — 안내 그림 한 장과 견주기 한 번입니다.
//
// 화면에서 떼어낸 것은 줄 수 때문만이 아닙니다. 이 관심사는 읽기(Vision)와 **완전히 다른
// 축**이고 같은 화면에 있을 뿐입니다 — 하나가 고장 나도 다른 하나는 그대로 돌아야 합니다.
//
// 상태를 훅이 들고 화면은 그리기만 합니다. 연타 방어(`tracing`)가 여기 있는 것은 접점
// 모듈에 상태를 두면 진실이 둘이 되기 때문이고, 읽기 쪽과 같은 규약입니다.

/** 견주기 줄이 싣는 값입니다. 접점의 union에 `unavailable`을 더하지 않고 여기서 붙입니다 —
 * 「요청이 갔는가」와 「결과가 무엇인가」는 다른 물음이라 접점이 다른 값으로 답합니다. */
export type ProbeTraceLine = HandwritingTraceOutcome | { readonly status: "unavailable" };

/**
 * 견주기와 안내 그림이 **같은 요청**을 씁니다.
 *
 * ⭐ 두 자리가 글자·크기·글꼴을 따로 들면 화면이 보여 주는 안내와 채점되는 안내가
 * 갈립니다. 이 축이 이미 그렇게 틀렸습니다 — 2026-09-28에 22pt 어긋났고, 화면에 보이는
 * 안내를 정확히 따라 써도 점수가 0이었습니다.
 */
function traceRequest(strokes: readonly Stroke[]): HandwritingTraceRequest {
  return {
    width: probeSurfaceSize.width,
    height: probeSurfaceSize.height,
    strokeWidth: probeStrokeWidth,
    strokes,
    glyph: probeTraceGlyph,
    fontSize: probeTraceFontSize,
    // ⚠ 화면이 이 글꼴로 글자를 그리지 않습니다 — 안내는 호스트가 구운 그림입니다.
    // 이름이 여기 있는 것은 **그 그림을 어느 글꼴로 구울지**를 정하기 때문입니다.
    fontName: "AppleSDGothicNeo-Regular",
    tolerance: probeTraceTolerance,
    // 색의 정본은 토큰입니다(ADR-0014 D1). 호스트가 상수를 박으면 정본이 둘이 됩니다 —
    // `DrawingSurface`가 획 색을 prop으로 받는 것과 같은 자리입니다.
    guideColor: color.gray[400],
  };
}

export type ProbeTrace = {
  /** 호스트가 구운 안내 PNG(base64)입니다. 호스트가 없으면 `null`입니다. */
  readonly guideImage: string | null;
  readonly line: ProbeTraceLine | null;
  readonly compare: (strokes: readonly Stroke[]) => void;
  readonly reset: () => void;
};

export function useProbeTrace(): ProbeTrace {
  const [guideImage, setGuideImage] = useState<string | null>(null);
  const [line, setLine] = useState<ProbeTraceLine | null>(null);
  const [comparing, setComparing] = useState(false);
  // 세대 카운터입니다. **요청이 겹치는 것을 막는 장치가 아닙니다** — 그것은 아래
  // `comparing` 가드가 이미 합니다(요청 중에는 새 요청이 안 나갑니다).
  //
  // 이것이 막는 것은 **지우고 난 뒤에 옛 답이 도착하는 것**입니다: 견주기를 누르고
  // 답이 오기 전에 `지우기`를 누르면, 지워진 획에 대한 점수가 뒤늦게 줄에 섭니다.
  // 사람은 빈 판을 보면서 0.8을 읽게 되고, 그것이 실기 기록을 오염시킵니다.
  const generation = useRef(0);

  // 마운트 때 한 번 굽습니다. 글자가 상수라 다시 부를 일이 없습니다 — 글자가 바뀌는
  // 화면이 서면 그 값이 dep이 됩니다. 호스트가 없으면 `onResult`가 오지 않으므로
  // `guideImage`가 `null`로 남고, 화면은 안내를 그리지 않습니다.
  useEffect(() => {
    guideHandwritingTrace(traceRequest([]), (outcome) => {
      setGuideImage(outcome.status === "rendered" ? outcome.image : null);
    });
  }, []);

  const compare = (strokes: readonly Stroke[]) => {
    if (comparing) {
      return;
    }

    setComparing(true);
    setLine(null);

    const requestedAt = ++generation.current;
    const requested = compareHandwritingTrace(traceRequest(strokes), (outcome) => {
      // 지나간 세대의 답은 버립니다. `comparing`은 그래도 풉니다 — 이 요청은 실제로
      // 끝났고, 안 풀면 다음 견주기가 영영 막힙니다.
      setComparing(false);
      if (requestedAt !== generation.current) {
        return;
      }
      setLine(outcome);
    });

    // 모듈이 없으면 콜백이 아예 오지 않습니다 — 그 사실을 사람이 읽을 수 있게 줄에
    // 세웁니다(읽기 쪽과 같은 자리, 같은 규약).
    if (requested === "unavailable") {
      setComparing(false);
      setLine({ status: "unavailable" });
    }
  };

  // 지우면 세대가 올라가 **날아오고 있던 답이 버려집니다.**
  const reset = () => {
    generation.current += 1;
    setLine(null);
  };

  return { guideImage, line, compare, reset };
}
