// 여정맵 Letters 추천의 결선입니다(ADR-0169). 레슨 중에는 띄우지 않습니다 — 레슨 자취가 끝난 레슨의 신호를 남기고, 지도가 한가해지면
// (다른 안내 · 대화상자 뒤, `ready`) 그 신호를 한 번 꺼내 이유를 정합니다. 띄워도 되면(`canRecommendLetters`) 레슨 완료 연출(발자국)이
// 끝나기를 `delayMs` 기다렸다가 대화상자를 세웁니다. 문턱은 `lettersRecommendConfig` 하나가 집니다.

import { useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import {
  canRecommendLetters,
  lettersRecommendConfig,
  loadLettersRecord,
  recommendReasonOf,
  saveLettersRecord,
  withKeepGoing,
  withShown,
  type LettersRecommendReason,
} from "../lib/letters-recommend";
import { LettersRecommendDialog } from "../screens/letters/LettersRecommendDialog";
import type { LearningTrail } from "./learning-trail";
import { todayLocal } from "./learning-trail-port";
import type { MoreWiring } from "./more-wiring";

export type LettersRecommend = { readonly open: boolean; readonly layer: ReactNode };

export function useLettersRecommend(input: {
  readonly trail: LearningTrail;
  readonly more: MoreWiring;
  /** 지도가 한가하고 다른 안내가 없음. */
  readonly ready: boolean;
}): LettersRecommend {
  const { trail, more, ready } = input;
  const [pending, setPending] = useState<LettersRecommendReason | null>(null);
  const [shown, setShown] = useState<LettersRecommendReason | null>(null);
  // 타이머가 끝날 때 그때의 결선을 씁니다 — `more`는 렌더마다 새로 지어지지만 의존성에 넣으면 타이머가 매번 다시 시작합니다(리뷰).
  const moreRef = useRef(more);
  moreRef.current = more;

  // 한가해지면 끝난 레슨의 신호를 꺼내 이유로 바꿉니다(띄우지 않을 이유면 버립니다).
  useEffect(() => {
    if (!ready || pending !== null || shown !== null) return;
    const signal = trail.takeSignal();
    const reason = signal === null ? null : recommendReasonOf(signal);
    if (reason === null || !canRecommendLetters(loadLettersRecord(), todayLocal())) return;
    setPending(reason);
  }, [ready, pending, shown]);

  // 연출이 끝나기를 기다렸다가 세웁니다. 그 사이 지도가 바빠지면 다시 한가해질 때 처음부터 기다립니다.
  useEffect(() => {
    if (!ready || pending === null) return undefined;
    const reason = pending;
    const timer = setTimeout(() => {
      setPending(null);
      // 기다리는 사이 Letters를 열었거나(메뉴) 다른 날이 됐을 수 있어 띄우기 직전에 다시 봅니다(리뷰 M1).
      const record = loadLettersRecord();
      if (!canRecommendLetters(record, todayLocal())) return;
      saveLettersRecord(withShown(record, todayLocal()));
      setShown(reason);
      moreRef.current.emit({ name: "letters_recommend_shown", reason });
    }, lettersRecommendConfig.delayMs);
    return () => clearTimeout(timer);
  }, [ready, pending]);

  const close = () => setShown(null);
  return {
    open: shown !== null,
    layer:
      shown === null ? null : (
        <LettersRecommendDialog
          reason={shown}
          onLearn={() => {
            more.emit({ name: "letters_recommend_clicked", reason: shown });
            close();
            more.onOpenLetters();
          }}
          onLater={(choice) => {
            more.emit({ name: "letters_recommend_dismissed", reason: shown, choice });
            if (choice === "keep_going") saveLettersRecord(withKeepGoing(loadLettersRecord()));
            close();
          }}
        />
      ),
  };
}
