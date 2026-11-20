import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import cross from "@libitums/icons/lynx/cross";
import volume from "@libitums/icons/lynx/volume";
import { Button } from "@libitums/ui-lynx/button";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { reviewChoicesOf } from "../../app/wordbook-entries";
import { announce } from "../../lib/accessibility";
import { playSound } from "../../lib/sound-effects";
import { useScreenBack } from "../../lib/use-back-handler";
import { useUiCopy } from "../../lib/ui-copy";
import { wordbookTestIds as ids, type WordbookReviewScreenProps } from "./wordbook.contract";

import "./wordbook-screen.css";
import "./wordbook-word.css";

// 오늘의 복습입니다(ADR-0168, 시안 WordbookReview). 「What does this mean?」 — 단어(와 소리)를 보고 뜻 셋 중 하나를 고릅니다.
// 맞으면 그 보기가 초록 · 「Got it」으로 옮긴다는 안내, 틀리면 고른 보기 빨강 · 정답 초록 · 「내일 다시」 안내입니다. 답은 한 문항에
// 한 번만 올라가고(간격 반복은 결선이 적음), 아래 단추는 답 전 Skip · 답 뒤 Next · 마지막 Done입니다.
export function WordbookReviewScreen({
  queue,
  pool,
  sound,
  onAnswer,
  onClose,
}: WordbookReviewScreenProps): ReactNode {
  const copy = useUiCopy().more.review;
  const playLabel = useUiCopy().more.wordbook.play;
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  useScreenBack(onClose);
  const entry = queue[index];
  if (entry === undefined) return null;
  const choices = reviewChoicesOf(entry.meaning, pool, index + entry.ko.length);
  const right = picked === entry.meaning;
  const last = index === queue.length - 1;
  const source = sound.sourceOf(entry);

  const pick = (choice: string) => {
    if (picked !== null) return;
    setPicked(choice);
    const correct = choice === entry.meaning;
    playSound(correct ? "correct_answer" : "wrong_answer");
    onAnswer(entry, correct);
    announce(correct ? copy.right(entry.ko) : copy.wrong(entry.meaning));
  };
  const handleNext = () => {
    "background only";
    if (last) {
      onClose();
      return;
    }
    setIndex(index + 1);
    setPicked(null);
  };
  const stateOf = (choice: string) =>
    picked === null
      ? "idle"
      : choice === entry.meaning
        ? "correct"
        : choice === picked
          ? "incorrect"
          : "idle";

  return (
    <view className="wordbook-review" data-testid={ids.review} data-answer={entry.meaning}>
      <view className="wordbook-review-head">
        <view data-testid={ids.reviewClose}>
          <RoundButton
            accessibilityLabel={copy.close}
            icon={cross}
            variant="neutral"
            size="m"
            bindtap={onClose}
          />
        </view>
        <view className="wordbook-review-progress">
          <view
            className="wordbook-review-fill"
            style={{ width: `${Math.round(((index + 1) / queue.length) * 100)}%` }}
          />
        </view>
        <text className="wordbook-review-count">{copy.progress(index + 1, queue.length)}</text>
      </view>
      <view className="wordbook-review-badge">
        <text className="wordbook-review-badge-label">{copy.badge}</text>
      </view>
      <text className="wordbook-review-question" accessibility-traits="header">
        {copy.question}
      </text>
      <view className="wordbook-review-card">
        <text className="wordbook-review-ko">{entry.ko}</text>
        <text className="wordbook-word-roman">{entry.roman}</text>
        {source === null ? null : (
          <RoundButton
            accessibilityLabel={playLabel}
            icon={volume}
            variant="neutral"
            size="m"
            bindtap={() => sound.play(source, false)}
          />
        )}
      </view>
      <view className="wordbook-review-choices">
        {choices.map((choice, position) => {
          const state = stateOf(choice);
          return (
            <view
              key={choice}
              className={`wordbook-choice wordbook-choice-${state}`}
              data-testid={ids.choice(position)}
              data-state={state}
              accessibility-element={true}
              flatten={false}
              accessibility-label={
                state === "correct"
                  ? `${choice}, ${copy.correctMark}`
                  : state === "incorrect"
                    ? `${choice}, ${copy.wrongMark}`
                    : choice
              }
              accessibility-traits={picked === null ? "button" : "none"}
              bindtap={() => {
                "background only";
                pick(choice);
              }}
            >
              <text className="wordbook-choice-label">{choice}</text>
              {state === "idle" ? null : (
                <text className="wordbook-choice-mark">
                  {state === "correct" ? copy.correctMark : copy.wrongMark}
                </text>
              )}
            </view>
          );
        })}
      </view>
      <view className="wordbook-review-spacer" />
      {picked === null ? null : (
        <text
          className={
            right
              ? "wordbook-feedback wordbook-feedback-correct"
              : "wordbook-feedback wordbook-feedback-incorrect"
          }
          data-testid={ids.feedback}
        >
          {right ? copy.right(entry.ko) : copy.wrong(entry.meaning)}
        </text>
      )}
      <view data-testid={ids.reviewNext}>
        <Button
          label={picked === null ? copy.skip : last ? copy.done : copy.next}
          variant={picked === null ? "subtle" : "brand"}
          size="xl"
          width="fill"
          bindtap={handleNext}
        />
      </view>
    </view>
  );
}
