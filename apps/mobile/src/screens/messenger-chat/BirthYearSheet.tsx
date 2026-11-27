import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { AppBottomSheet } from "../../components/app-bottom-sheet/AppBottomSheet";
import { useUiCopy } from "../../lib/ui-copy";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import { birthYearScrollIndex } from "./safety-rules";

import "./safety.css";

export type BirthYearSheetProps = {
  /** 새 연도가 먼저입니다(`birthYearOptions`). */
  readonly years: readonly number[];
  readonly selected: number | null;
  readonly onSelect: (year: number) => void;
  readonly onContinue: () => void;
  /** 닫기 단추 · 바깥 탭 — 방을 열자마자 뜬 시트면 방을 나가는 쪽이 받습니다(건너뛰기 없음, ADR-0125 개정 2026-11-27). */
  readonly onClose: () => void;
};

// 첫 대화 전에 생년을 묻는 시트입니다(ADR-0125). 연도 목록에서 고르고, 고르기 전에는 Continue가 꺼져 있습니다.
// 고른 연도가 없으면 목록 가운데에서 엽니다 — 값은 비워 둔 채 자리만 옮깁니다(2026-11-27 개정).
// 「Skip for now」는 없습니다(2026-11-27) — 연도를 골라 Continue해야 대화가 시작되고, 닫으면 답하지 않은 채로 남습니다.
export function BirthYearSheet({
  years,
  selected,
  onSelect,
  onContinue,
  onClose,
}: BirthYearSheetProps): ReactNode {
  const copy = useUiCopy().messengerChat;
  const sheet = copy.safety.birthYear;
  // 처음 열 때 한 번만 정합니다 — 고르는 동안 칸이 따라 움직이지 않습니다.
  const [scrollIndex] = useState(() => birthYearScrollIndex(years, selected));
  return (
    <view data-testid={ids.birthYearSheet}>
      <AppBottomSheet
        title={sheet.title}
        closeAccessibilityLabel={copy.storyPoint.close}
        dismissible={true}
        actions={[
          {
            id: "continue",
            label: sheet.continue,
            disabled: selected === null,
            bindtap: onContinue,
          },
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
            initial-scroll-to-index={scrollIndex}
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
        </view>
      </AppBottomSheet>
    </view>
  );
}
