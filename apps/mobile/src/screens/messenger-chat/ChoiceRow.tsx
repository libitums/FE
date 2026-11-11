import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";

import "./chat-settings.css";

export type ChoiceRowProps = {
  readonly testId: string;
  readonly title: string;
  readonly body?: string;
  /** 제목 옆 작은 꼬리표(예: 「default」). */
  readonly tag?: string;
  readonly selected: boolean;
  readonly disabled?: boolean;
  readonly onSelect: () => void;
};

// 시트 안의 라디오 한 줄입니다(ADR-0126). Android 접근성 트리에 남도록 flatten={false}, 탭은 accessibility-enable-tap(ADR-0125).
export function ChoiceRow({
  testId,
  title,
  body,
  tag,
  selected,
  disabled = false,
  onSelect,
}: ChoiceRowProps): ReactNode {
  const copy = useUiCopy().messengerChat;
  // 꼬리표(「default」)도 낭독에 넣습니다 — 화면에만 있으면 스크린리더가 기본값을 알 수 없습니다.
  const named = tag === undefined ? title : `${title}, ${tag}`;
  const base = body === undefined ? named : `${named}, ${body}`;
  return (
    <view
      className={`chat-choice${selected ? " chat-choice-on" : ""}${disabled ? " chat-choice-off" : ""}`}
      data-testid={testId}
      data-selected={selected ? "true" : "false"}
      flatten={false}
      accessibility-element={true}
      accessibility-label={selected ? copy.toggle.selected(base) : base}
      accessibility-traits={disabled ? "disabled" : "button"}
      accessibility-role-description="radio"
      accessibility-enable-tap={!disabled}
      bindtap={
        disabled
          ? undefined
          : () => {
              "background only";
              onSelect();
            }
      }
    >
      <view className={`chat-choice-radio${selected ? " chat-choice-radio-on" : ""}`}>
        {selected ? <view className="chat-choice-dot" /> : null}
      </view>
      <view className="chat-choice-text">
        <text className="chat-choice-title" accessibility-element={false}>
          {title}
          {tag === undefined ? null : <text className="chat-choice-tag">{` · ${tag}`}</text>}
        </text>
        {body === undefined ? null : (
          <text className="chat-choice-body" accessibility-element={false}>
            {body}
          </text>
        )}
      </view>
    </view>
  );
}
