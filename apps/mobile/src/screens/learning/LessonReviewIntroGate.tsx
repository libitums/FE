import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { LessonReviewBadge } from "./LessonReviewBadge";
import { useScreenBack } from "../../lib/use-back-handler";
import { useUiCopy } from "../../lib/ui-copy";

import "./lesson-review-badge.css";

// 다시 도전의 시작 게이트입니다(ADR-0058 ⟨2026-10-30⟩, 사용자 결정 「틀린 거 다시 뜨기 전에 애니메이션이 먼저」). 첫 다시
// 도전 문항 앞에 빈 화면 위로 「Let’s fix n mistakes」 알약을 한 번 재생하고(1.8초), 다 걷히면 문항 화면(`children`)을
// 세웁니다. 화면을 누르면 기다리지 않고 바로 넘어갑니다(WCAG 2.2.1 — 기다리는 것 말고 할 수 있는 일). 시스템 뒤로도 같은
// 「건너뛰기」입니다 — 게이트 동안은 학습 껍데기(나가기 확인)가 아직 서지 않아, 등록하지 않으면 뒤로가 앱을 내려 버립니다.
// 그다음 뒤로는 껍데기의 나가기 확인입니다. 상태는 재생 중인가 하나뿐이고 되돌아가지 않습니다.
export function LessonReviewIntroGate({
  count,
  children,
}: {
  /** 처음 틀린 수입니다. `null`이면 게이트 없이 곧바로 문항입니다(첫 화면이 아님). */
  readonly count: number | null;
  readonly children: ReactNode;
}): ReactNode {
  const copy = useUiCopy();
  const [playing, setPlaying] = useState(count !== null);
  const active = playing && count !== null;
  const skip = () => {
    "background only";
    setPlaying(false);
  };
  useScreenBack(active ? skip : null);
  if (!active) return children;
  return (
    <view
      className="lesson-review-gate"
      data-testid="lesson-review-gate"
      accessibility-element={true}
      accessibility-label={copy.learningShell.review.intro(count)}
      accessibility-traits="button"
      bindtap={skip}
    >
      <LessonReviewBadge count={count} onDone={() => setPlaying(false)} />
    </view>
  );
}
