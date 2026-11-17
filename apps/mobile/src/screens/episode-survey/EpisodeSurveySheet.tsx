import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { Button } from "@libitums/ui-lynx/button";
import { OptionSelector } from "@libitums/ui-lynx/option-selector";
import { TextField } from "@libitums/ui-lynx/text-field";

import {
  feedbackMessageMaxLength,
  feedbackRatings,
  feedbackReasons,
  feedbackReasonsOf,
  surveyAsksReasons,
  surveyMessageOf,
} from "../../lib/feedback-api";
import { AppBottomSheet } from "../../components/app-bottom-sheet/AppBottomSheet";
import type { FeedbackRating, FeedbackReason } from "../../lib/feedback.contract";
import { announce } from "../../lib/accessibility";
import { useLayerBack } from "../../lib/use-back-handler";
import { useUiCopy } from "../../lib/ui-copy";
import { restoreAccessibilityFocus } from "../messenger-chat/chat-input-focus";

import "./episode-survey-sheet.css";

/** 「Other」 글 칸 입력의 `id`입니다. */
export const episodeSurveyMessageInputId = "episode-survey-message-input";

/** 이유 단계 질문의 `id`입니다 — 별점을 고른 뒤 접근성 초점을 보내는 곳. */
export const episodeSurveyReasonsLabelId = "episode-survey-reasons-label";

/**
 * 이보다 높아야 시스템 키보드가 선 것으로 봅니다. Android는 키보드가 닫혀도 아래 내비게이션 높이(24)를 보냅니다
 * (기기 로그 2026-11-17). 이만큼 낮은 키보드는 없습니다.
 */
const KEYBOARD_UP_MIN_HEIGHT = 64;

/** 단계가 바뀐 다음 프레임입니다 — 새 입력이 서야 초점을 받을 수 있습니다. */
const NEXT_FRAME_MS = 16;

export type EpisodeSurveySheetProps = {
  readonly episodeTitle: string;
  /**
   * 4 · 5점은 누르는 즉시(이유 없음), 1~3점은 이유 단계를 거쳐 답이 됩니다. `reasons`는 고른 이유(표시 순서),
   * `message`는 「Other」와 함께 보낸 글이거나 `null`.
   */
  readonly onAnswer: (
    rating: FeedbackRating,
    reasons: readonly FeedbackReason[],
    message: string | null,
  ) => void;
  /** 별점 단계의 `Not now` · 바깥 누름 · 닫기 · 끌어내리기 · 뒤로는 건너뛰기입니다. 이유 단계에서는 `onAnswer(별점, [], null)`입니다. */
  readonly onSkip: () => void;
};

// 에피소드를 끝낸 뒤 맵 위에 한 번 뜨는 설문입니다(ADR-0036). 4 · 5점은 누르면 끝나고, 1~3점은 같은 시트에서
// 이유 체크리스트로 넘어갑니다(개정 2026-11-12 글 칸 → 2026-11-17 체크리스트). 글 칸은 「Other」를 고른 동안만 섭니다.
// 이유 단계에서 닫는 길은 모두 「그 별점 + 이유 없음 + 글 없음」의 답입니다 — 고른 별점을 버리지 않습니다.
export function EpisodeSurveySheet({
  episodeTitle,
  onAnswer,
  onSkip,
}: EpisodeSurveySheetProps): ReactNode {
  const copy = useUiCopy();
  // 1~3점을 고른 뒤의 이유 단계입니다. `null`이면 별점 단계.
  const [pending, setPending] = useState<FeedbackRating | null>(null);
  const [checkedIds, setCheckedIds] = useState<readonly string[]>([]);
  const [message, setMessage] = useState("");
  const reasons = feedbackReasonsOf(checkedIds);
  const asksMessage = reasons.includes("other");
  // 글 칸이 띄운 시스템 키보드 높이입니다. 호스트가 화면을 줄이지 않아(iOS) 시트가 그만큼 아래를 비워 키보드 위로 올라갑니다.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardUp = asksMessage && keyboardHeight > KEYBOARD_UP_MIN_HEIGHT;
  // 「Other」를 풀면 글 칸이 사라집니다. 글 칸(ui-lynx TextField)은 비제어라 다시 서면 빈 칸이므로, 보이지 않는 옛 글과
  // 사라진 칸이 남긴 키보드 높이도 함께 비웁니다(리뷰 C1 · W1).
  const chooseReasons = (ids: readonly string[]): void => {
    setCheckedIds(ids);
    if (!feedbackReasonsOf(ids).includes("other")) {
      setMessage("");
      setKeyboardHeight(0);
    }
  };
  const close = (): void => {
    if (pending === null) onSkip();
    else onAnswer(pending, [], null);
  };
  // 1~3점을 고르면 누른 보기가 사라집니다. 스크린리더 초점이 사라진 노드에 남지 않게 다음 프레임에 이유 질문으로
  // 옮기고(초점 → 낭독 순서), 고른 별점을 낭독해 받아들여졌음을 알립니다(a11y M1).
  useEffect(() => {
    if (pending === null) return undefined;
    const spoken = `${pending} · ${copy.feedback.ratingOption[pending]}`;
    const handle = setTimeout(() => {
      restoreAccessibilityFocus(episodeSurveyReasonsLabelId);
      announce(spoken);
    }, NEXT_FRAME_MS);
    return () => clearTimeout(handle);
  }, [pending, copy]);
  // 시스템 뒤로가기 = 보이는 닫는 길과 같은 결과입니다. 설문이 서 있는 동안만 등록됩니다.
  useLayerBack(close);
  return (
    <AppBottomSheet
      title={copy.feedback.survey.title}
      // 이유 단계에서는 질문이 설명을 대신합니다 — 작은 화면(360×640)에서 여덟 항목이 한 화면에 들게 합니다.
      description={pending === null ? copy.feedback.survey.description(episodeTitle) : undefined}
      closeAccessibilityLabel={copy.feedback.survey.skip}
      ondismiss={close}
    >
      {pending === null ? (
        <view data-testid="episode-survey-options">
          <OptionSelector
            groupLabel={copy.feedback.survey.title}
            options={feedbackRatings.map((value) => ({
              id: String(value),
              label: `${value} · ${copy.feedback.ratingOption[value]}`,
            }))}
            selectedIds={[]}
            selection="single"
            commit="immediate"
            variant="outlined"
            size="s"
            onChange={() => undefined}
            onCommit={(id) => {
              const rating = feedbackRatings.find((value) => String(value) === id);
              if (rating === undefined) return;
              if (surveyAsksReasons(rating)) setPending(rating);
              else onAnswer(rating, [], null);
            }}
          />
        </view>
      ) : (
        <>
          {/* 키보드가 선 동안은 체크리스트를 내려 글 칸 · Send가 키보드 위에 들게 합니다(360×640 기기 확인). */}
          {keyboardUp ? null : (
            <>
              {/* 시트의 내용 칸은 스스로 스크롤하지 않고 줄어들기만 합니다. 작은 화면 · 큰 글자 · 키보드에서 체크리스트만
                  스크롤하고, 글 칸 · Send · Not now는 줄지 않게 둡니다(360×640 기기 확인 2026-11-17). */}
              <scroll-view
                className="episode-survey-reasons-scroll"
                data-testid="episode-survey-reasons-scroll"
                scroll-orientation="vertical"
                scroll-bar-enable={false}
              >
                <view className="episode-survey-reasons" data-testid="episode-survey-reasons">
                  <text
                    id={episodeSurveyReasonsLabelId}
                    className="episode-survey-reasons-label"
                    flatten={false}
                    accessibility-element={true}
                    accessibility-label={copy.feedback.survey.reasonsLabel}
                    accessibility-traits="header"
                    accessibility-heading={true}
                  >
                    {copy.feedback.survey.reasonsLabel}
                  </text>
                  <OptionSelector
                    groupLabel={copy.feedback.survey.reasonsLabel}
                    options={feedbackReasons.map((reason) => ({
                      id: reason,
                      label: copy.feedback.survey.reasonOption[reason],
                      // 「Other」는 글 칸을 여는 항목이라 스크린리더에 그 결과까지 알립니다(접근성 점검 m3).
                      ...(reason === "other"
                        ? { accessibilityLabel: copy.feedback.survey.otherAccessibilityLabel }
                        : {}),
                    }))}
                    selectedIds={checkedIds}
                    selection="multiple"
                    commit="deferred"
                    layout="grid"
                    variant="outlined"
                    size="s"
                    onChange={chooseReasons}
                  />
                </view>
              </scroll-view>
            </>
          )}
          {asksMessage ? (
            <view
              className={
                keyboardUp
                  ? "episode-survey-message episode-survey-message-keyboard"
                  : "episode-survey-message"
              }
              data-testid="episode-survey-message"
            >
              <TextField
                id={episodeSurveyMessageInputId}
                label={copy.feedback.survey.messageLabel}
                accessibilityLabel={copy.feedback.survey.messageLabel}
                counter={{ maxLength: feedbackMessageMaxLength }}
                bindinput={setMessage}
                bindkeyboardheightchange={setKeyboardHeight}
              />
            </view>
          ) : null}
          <view className="episode-survey-send" data-testid="episode-survey-send">
            <Button
              label={copy.feedback.send}
              variant="brand"
              size="xl"
              width="fill"
              bindtap={() => onAnswer(pending, reasons, surveyMessageOf(reasons, message))}
            />
          </view>
        </>
      )}
      {/* 키보드가 선 동안은 Not now를 내립니다 — 작은 화면(360×640)에서 Send가 키보드 위에 남게. 닫기 · 뒤로는 그대로입니다. */}
      {/* 시트의 기본 액션 버튼(m)은 보기 목록 아래에서 너무 작아, 다른 화면의 주 버튼과 같은 xl로 둡니다. */}
      {keyboardUp ? null : (
        <view
          className={
            pending === null
              ? "episode-survey-skip"
              : "episode-survey-skip episode-survey-skip-after-send"
          }
          data-testid="episode-survey-skip"
        >
          <Button
            label={copy.feedback.survey.skip}
            variant="subtle"
            size="xl"
            width="fill"
            bindtap={close}
          />
        </view>
      )}
      {keyboardUp ? (
        <view
          data-testid="episode-survey-keyboard"
          style={{ height: `${keyboardHeight}px`, flexShrink: 0 }}
        />
      ) : null}
    </AppBottomSheet>
  );
}
