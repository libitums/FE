// 미션 대화의 아래 카드 둘 — 힌트 · 「Mission success!」. 대본형 롤플레이의 흰 패널 · Hint 단계와 같은 말로 그립니다(ADR-0201 D6 적용 2):
// 패널 머리표(주색 작은 글) · 정답 상자(`RoleplayAnswerBox` — 한국어 · 로마자 · 뜻) · 중립 「Hear it」 단추 · 결과 머리(✓ 표 · 초록 제목).

import type { ReactNode } from "@lynx-js/react";

import check from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";
import { Button } from "@libitums/ui-lynx/button";

import { useUiCopy } from "../../lib/ui-copy";
import { useMissionCopy } from "../../lib/ui-copy-roleplay-mission-tables";
import { RoleplayAnswerBox } from "../roleplay-story/RoleplayAnswerBox";
import { missionTestIds as ids } from "./mission-test-ids";
import type { MissionHintResponse } from "./roleplay-mission.contract";

import "../roleplay-story/roleplay-story-screen.css";
import "./roleplay-mission-talk.css";
import "./roleplay-mission-voice.css";

function CardActions({
  primary,
  secondary,
}: {
  readonly primary: { readonly testId: string; readonly label: string; readonly onTap: () => void };
  readonly secondary: {
    readonly testId: string;
    readonly label: string;
    readonly onTap: () => void;
    readonly disabled?: boolean;
  };
}): ReactNode {
  return (
    <view className="mission-hint-actions">
      <view className="mission-hint-action" data-testid={primary.testId}>
        <Button
          label={primary.label}
          variant="brand"
          size="m"
          width="fill"
          bindtap={primary.onTap}
        />
      </view>
      <view className="mission-hint-action" data-testid={secondary.testId}>
        <Button
          label={secondary.label}
          variant="neutral"
          size="m"
          width="fill"
          disabled={secondary.disabled === true}
          bindtap={secondary.onTap}
        />
      </view>
    </view>
  );
}

export type MissionHintCardProps = {
  readonly hint: MissionHintResponse;
  /** 예문 듣기 — 재생(합성 포함) 중이면 표시가 바뀝니다. */
  readonly listening: boolean;
  /** 예문 듣기 — 힌트 번호(`hintNo`)가 없으면(서버가 예문을 저장하지 못함) `null`이고 단추가 없습니다. */
  readonly onListen: (() => void) | null;
  readonly onUse: () => void;
  readonly onClose: () => void;
};

/**
 * 펼친 힌트 — 「Try saying」 머리표 · 정답 상자(한국어 · 로마자 · 뜻) · 감점 안내, 「Hear it」(예문 소리, 대본형 Hint 단계와 같은 단추) ·
 * Use this(입력 칸 채움) / Close hint.
 */
export function MissionHintCard({
  hint,
  listening,
  onListen,
  onUse,
  onClose,
}: MissionHintCardProps): ReactNode {
  const mission = useMissionCopy();
  const ui = useUiCopy();
  return (
    <view className="mission-hint" data-testid={ids.hintCard}>
      <view
        className="mission-hint-body"
        flatten={false}
        accessibility-element={true}
        accessibility-label={`${mission.hintTitle}: ${hint.ko}, ${hint.roman}, ${hint.meaning}. ${mission.hintPenalty}`}
      >
        <text className="roleplay-story-panel-label">{mission.hintTitle}</text>
        <RoleplayAnswerBox
          testId={ids.hintAnswer}
          answer={[{ text: hint.ko, differs: false }]}
          roman={hint.roman}
          meaning={hint.meaning}
        />
        <text className="mission-hint-sub">{mission.hintPenalty}</text>
      </view>
      {onListen === null ? null : (
        <view
          className="roleplay-story-hint-row"
          data-testid={ids.hintListen}
          data-play={listening ? "true" : "false"}
        >
          <view className="roleplay-story-hint-button">
            <Button
              label={ui.roleplayStory.hearIt}
              variant="neutral"
              size="m"
              width="fill"
              bindtap={onListen}
            />
          </view>
        </view>
      )}
      <CardActions
        primary={{ testId: ids.hintUse, label: mission.hintUse, onTap: onUse }}
        secondary={{ testId: ids.hintClose, label: mission.hintClose, onTap: onClose }}
      />
    </view>
  );
}

export type MissionSuccessCardProps = {
  readonly canFinish: boolean;
  readonly onKeepGoing: () => void;
  readonly onFinish: () => void;
};

/**
 * 「Mission success!」 — 필수 목표를 이뤘는데 판이 열려 있을 때 한 번(ADR-0177). 힌트 카드와 같은 자리 · 같은 면이고, 머리는 대본형
 * 정답 패널과 같은 ✓ 표 · 초록 제목입니다. Keep going(카드만 닫음) / Finish(채점 → 리포트). 답을 기다리는 동안은 Finish가 잠깁니다.
 */
export function MissionSuccessCard({
  canFinish,
  onKeepGoing,
  onFinish,
}: MissionSuccessCardProps): ReactNode {
  const success = useMissionCopy().extra.success;
  return (
    <view className="mission-hint mission-success" data-testid={ids.successCard}>
      <view
        className="mission-hint-body"
        flatten={false}
        accessibility-element={true}
        accessibility-traits="header"
        accessibility-label={`${success.title} ${success.body}`}
      >
        <view className="roleplay-story-result-head">
          <view className="roleplay-story-result-mark roleplay-story-result-mark-correct">
            <svg
              className="roleplay-story-result-icon"
              content={check}
              current-color={color.white}
            />
          </view>
          <text className="roleplay-story-result-title roleplay-story-result-title-correct">
            {success.title}
          </text>
        </view>
        <text className="mission-hint-sub">{success.body}</text>
      </view>
      <CardActions
        primary={{ testId: ids.successContinue, label: success.keepGoing, onTap: onKeepGoing }}
        secondary={{
          testId: ids.successFinish,
          label: success.finish,
          onTap: onFinish,
          disabled: !canFinish,
        }}
      />
    </view>
  );
}
