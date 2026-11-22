import { useEffect } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { Button } from "@libitums/ui-lynx/button";

import { ComposeQuizBank, ComposeQuizCard } from "../../components/ComposeQuizParts";
import { useComposeQuiz } from "../../components/use-compose-quiz";
import { announce } from "../../lib/accessibility";
import { COMPOSE_ROUNDS } from "../../lib/letters/compose-quiz";
import type { ComposeVerdict } from "../../lib/letters/compose-quiz";
import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { useLeaveOnce } from "../../lib/use-leave-once";
import { EntryBasicsFrame } from "./EntryBasicsFrame";
import { entryBasicsTestIds as ids } from "./entry-basics.contract";
import type { EntryBasicsComposeScreenProps } from "./entry-basics.contract";

import "./entry-basics-compose.css";

// 합치기 세 문제입니다(ADR-0176, 시안 Compose). 문제 · 판정 · 낭독 · 소리는 Letters › Practice와 같은 부품이고
// (`useComposeQuiz` · `ComposeQuizParts`), 다른 것은 틀 · 판정 글 · 마지막 단추(Continue → 준비 완료)입니다.
// 누른 단추가 사라지므로 Next · Try again 뒤에는 바뀐 문제를 읽어 줍니다.
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
  const quiz = useComposeQuiz({
    sound,
    autoPlay,
    completion: "silent",
    onComplete: () => leave(onNext),
  });
  const { state, round, target, verdict } = quiz;
  const upcoming = COMPOSE_ROUNDS[state.round + 1];
  const action =
    verdict === "correct"
      ? {
          label: upcoming === undefined ? uiCopy.common.continue : uiCopy.common.next,
          run: () => {
            quiz.dispatch({ type: "next" });
            if (upcoming !== undefined) announce(copy.make(upcoming.roman));
          },
        }
      : verdict === "incorrect"
        ? {
            label: copy.tryAgain,
            run: () => {
              quiz.dispatch({ type: "retry" });
              announce(copy.make(round.roman));
            },
          }
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
      <text
        className="entry-basics-compose-count"
        data-testid={ids.count}
        flatten={false}
        accessibility-element={true}
        accessibility-label={uiCopy.learningShell.headerQuestionOf(
          copy.formLabel,
          state.round + 1,
          COMPOSE_ROUNDS.length,
        )}
      >
        {`${copy.formLabel} · ${state.round + 1} / ${COMPOSE_ROUNDS.length}`}
      </text>
      <text
        className="entry-basics-title"
        data-testid={ids.title}
        flatten={false}
        accessibility-element={true}
        accessibility-heading={true}
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
        {/* 판정 자리는 늘 잡아 둡니다 — 글이 서도 타일이 움직이지 않습니다. */}
        <view className="entry-basics-compose-verdict">
          {verdict === null ? null : <BasicsVerdict result={verdict} />}
        </view>
      </view>
      <view className="entry-basics-compose-bank">
        <ComposeQuizBank quiz={quiz} romanization={romanization} />
      </view>
    </EntryBasicsFrame>
  );
}

// 시안대로 배지 없는 글입니다 — 레슨 배지(흰 14px)는 초록 면 위 3.07:1이라 첫 실행 화면에 들이지 않습니다. 낱말 · 효과음은
// 레슨 배지와 같은 값이고, 낱말이 있으므로 색만으로 가르지 않습니다.
function BasicsVerdict({ result }: { readonly result: ComposeVerdict }): ReactNode {
  const copy = useUiCopy();
  useEffect(() => {
    playSound(result === "correct" ? "correct_answer" : "wrong_answer");
  }, [result]);
  return (
    <text
      className={`entry-basics-verdict entry-basics-verdict-${result}`}
      data-testid="answer-verdict"
      data-result={result}
      flatten={false}
      accessibility-element={true}
    >
      {copy.common.answerResult[result]}
    </text>
  );
}
