import type { ReactNode } from "@lynx-js/react";

import { Button } from "@libitums/ui-lynx/button";

import { AnswerVerdict } from "../../components/AnswerVerdict";
import { ComposeQuizBank, ComposeQuizCard } from "../../components/ComposeQuizParts";
import { useComposeQuiz } from "../../components/use-compose-quiz";
import { COMPOSE_ROUNDS } from "../../lib/letters/compose-quiz";
import { useUiCopy } from "../../lib/ui-copy";
import { useLeaveOnce } from "../../lib/use-leave-once";
import { EntryBasicsFrame } from "./EntryBasicsFrame";
import { entryBasicsTestIds as ids } from "./entry-basics.contract";
import type { EntryBasicsComposeScreenProps } from "./entry-basics.contract";

import "./entry-basics-compose.css";

// 합치기 세 문제입니다(ADR-0176, 시안 Compose). 문제 · 판정 · 낭독 · 소리는 Letters › Practice와 같은 부품이고
// (`useComposeQuiz` · `ComposeQuizParts`), 다른 것은 틀과 마지막 단추(Continue → 준비 완료)뿐입니다.
export function EntryBasicsComposeScreen({
  romanization,
  sound,
  autoPlay,
  onNext,
  onBack,
  onSkip,
}: EntryBasicsComposeScreenProps): ReactNode {
  const uiCopy = useUiCopy();
  const copy = uiCopy.more.compose;
  const leave = useLeaveOnce();
  const quiz = useComposeQuiz({ sound, autoPlay, onComplete: () => leave(onNext) });
  const { state, target, verdict } = quiz;
  const last = state.round === COMPOSE_ROUNDS.length - 1;
  const action =
    verdict === "correct"
      ? {
          label: last ? uiCopy.common.continue : uiCopy.common.next,
          run: () => quiz.dispatch({ type: "next" }),
        }
      : verdict === "incorrect"
        ? { label: copy.tryAgain, run: () => quiz.dispatch({ type: "retry" }) }
        : null;

  return (
    <EntryBasicsFrame
      testId={ids.compose}
      current={2}
      onBack={() => leave(onBack)}
      onSkip={() => leave(onSkip)}
      footer={
        <view className="entry-basics-compose-action">
          {action === null ? null : (
            <view className="entry-basics-next" data-testid={ids.next}>
              <Button
                label={action.label}
                variant="brand"
                size="xl"
                width="fill"
                bindtap={action.run}
              />
            </view>
          )}
        </view>
      }
    >
      <text className="entry-basics-compose-count">
        {`${copy.formLabel} · ${state.round + 1} / ${COMPOSE_ROUNDS.length}`}
      </text>
      <text
        className="entry-basics-title"
        data-testid={ids.title}
        accessibility-traits="header"
      >
        {copy.instruction}
      </text>
      <view className="entry-basics-middle">
        <ComposeQuizCard
          quiz={quiz}
          romanization={romanization}
          speaker={sound.sourceOf(target) === null ? "unavailable" : "ready"}
        />
        {/* 판정 자리는 늘 잡아 둡니다 — 배지가 서도 타일이 움직이지 않습니다. */}
        <view className="entry-basics-compose-verdict">
          {verdict === null ? null : <AnswerVerdict result={verdict} />}
        </view>
      </view>
      <view className="entry-basics-compose-bank">
        <ComposeQuizBank quiz={quiz} romanization={romanization} />
      </view>
    </EntryBasicsFrame>
  );
}
