import type { ReactNode } from "@lynx-js/react";

import { BottomSheet } from "@libitums/ui-lynx/bottom-sheet";

import { useUiCopy } from "../../lib/ui-copy";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

import "./safety.css";

export type BirthYearSheetProps = {
  /** 새 연도가 먼저입니다(`birthYearOptions`). */
  readonly years: readonly number[];
  readonly selected: number | null;
  /** false면 닫기 단추 · 바깥 탭으로 닫지 않습니다 — 방을 열자마자 뜬 시트는 Continue · Skip · 뒤로가기로만 끝납니다. */
  readonly dismissible: boolean;
  readonly onSelect: (year: number) => void;
  readonly onContinue: () => void;
  readonly onSkip: () => void;
  readonly onClose: () => void;
};

// 첫 대화 전에 생년을 묻는 시트입니다(ADR-0125). 연도 목록에서 고르고, 고르기 전에는 Continue가 꺼져 있습니다.
export function BirthYearSheet({
  years,
  selected,
  dismissible,
  onSelect,
  onContinue,
  onSkip,
  onClose,
}: BirthYearSheetProps): ReactNode {
  const copy = useUiCopy().messengerChat;
  const sheet = copy.safety.birthYear;
  return (
    <view data-testid={ids.birthYearSheet}>
      <BottomSheet
        title={sheet.title}
        closeAccessibilityLabel={copy.storyPoint.close}
        dismissible={dismissible}
        actions={[
          {
            id: "continue",
            label: sheet.continue,
            disabled: selected === null,
            bindtap: onContinue,
          },
          { id: "skip", label: sheet.skip, bindtap: onSkip },
        ]}
        ondismiss={onClose}
      >
        <view className="chat-birth-year">
          {/* 설명은 시트의 description 자리 대신 여기 둡니다 — 그 자리는 시트 안 scroll-view라 기기에서 높이가 서지 않아
              글이 그려지지 않았습니다(ADR-0125 기기 확인). */}
          <text className="chat-birth-year-body">{sheet.body}</text>
          <scroll-view
            className="chat-birth-year-list"
            scroll-orientation="vertical"
            scroll-bar-enable={false}
          >
            {/* 스크롤 칸에 낭독 이름을 달지 않습니다 — Android는 이름 있는 scroll-view를 요소 하나로 묶어 안의 연도 줄을
                숨겼습니다(ADR-0125 기기 확인). 무엇을 고르는지는 시트 제목이 말합니다. */}
            {years.map((year) => {
              const on = year === selected;
              return (
                <view
                  key={year}
                  className={`chat-birth-year-row${on ? " chat-birth-year-row-on" : ""}`}
                  data-testid={ids.birthYearOption(year)}
                  data-selected={on ? "true" : "false"}
                  flatten={false}
                  accessibility-element={true}
                  accessibility-label={on ? copy.toggle.selected(String(year)) : String(year)}
                  accessibility-traits="button"
                  accessibility-role-description="radio"
                  accessibility-enable-tap={true}
                  bindtap={() => {
                    "background only";
                    onSelect(year);
                  }}
                >
                  <text
                    className={`chat-birth-year-text${on ? " chat-birth-year-text-on" : ""}`}
                    accessibility-element={false}
                  >
                    {String(year)}
                  </text>
                </view>
              );
            })}
          </scroll-view>
          <text className="chat-birth-year-note">{sheet.skipNote}</text>
        </view>
      </BottomSheet>
    </view>
  );
}
