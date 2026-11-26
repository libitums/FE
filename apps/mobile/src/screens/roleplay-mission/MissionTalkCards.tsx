import type { ReactNode } from "@lynx-js/react";

import { Button } from "@libitums/ui-lynx/button";

import { useMissionCopy } from "../../lib/ui-copy-roleplay-mission-tables";
import { missionTestIds as ids } from "./mission-test-ids";
import type { MissionHintResponse } from "./roleplay-mission.contract";

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
          variant="subtle"
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

/** 펼친 힌트 — 한국어 예문(+ 듣기) · 로마자 · 뜻 · 감점 안내, Use this(입력 칸 채움) / Close. */
export function MissionHintCard({
  hint,
  listening,
  onListen,
  onUse,
  onClose,
}: MissionHintCardProps): ReactNode {
  const mission = useMissionCopy();
  return (
    <view className="mission-hint" data-testid={ids.hintCard}>
      <view
        accessibility-element={true}
        accessibility-label={`${mission.hintTitle}: ${hint.ko}, ${hint.roman}, ${hint.meaning}`}
      >
        <text className="mission-hint-title">{mission.hintTitle}</text>
        <text className="mission-hint-ko">{hint.ko}</text>
        <text className="mission-hint-sub">{hint.roman}</text>
        <text className="mission-hint-sub">{hint.meaning}</text>
        <text className="mission-hint-sub">{mission.hintPenalty}</text>
      </view>
      {onListen === null ? null : (
        <view className="mission-hint-ko-row">
          <text
            className="mission-composer-link"
            data-testid={ids.hintListen}
            data-play={listening ? "true" : "false"}
            accessibility-traits="button"
            bindtap={onListen}
          >
            {mission.extra.voice.hintListen}
          </text>
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
 * 「Mission success!」 — 필수 목표를 이뤘는데 판이 열려 있을 때 한 번(ADR-0177). 힌트 카드와 같은 자리 · 같은 면이고,
 * Keep going(카드만 닫음) / Finish(채점 → 리포트). 답을 기다리는 동안은 Finish가 잠깁니다.
 */
export function MissionSuccessCard({
  canFinish,
  onKeepGoing,
  onFinish,
}: MissionSuccessCardProps): ReactNode {
  const success = useMissionCopy().extra.success;
  return (
    <view className="mission-hint" data-testid={ids.successCard}>
      <view accessibility-element={true} accessibility-label={`${success.title} ${success.body}`}>
        <text className="mission-hint-title" accessibility-traits="header">
          {success.title}
        </text>
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
