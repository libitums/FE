import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { BottomSheet } from "@libitums/ui-lynx/bottom-sheet";

import { useUiCopy } from "../../lib/ui-copy";
import { PROACTIVE_HOURS } from "./chat-settings-rules";
import type { ChatProactivePref } from "./chat-source.contract";
import { ChoiceRow } from "./ChoiceRow";
import { chatSettingsTestIds as ids } from "./chat-settings.contract";

import "./chat-settings.css";

export type ProactiveSheetProps = {
  readonly pref: ChatProactivePref;
  readonly hour: number | null;
  readonly onSave: (pref: ChatProactivePref, hour: number | null) => void;
  readonly onClose: () => void;
};

const prefs: readonly ChatProactivePref[] = ["off", "daily1", "daily2"];

// 캐릭터가 먼저 보내는 메시지의 빈도 · 시각 시트입니다(ADR-0126). 끔이면 시각을 고를 수 없습니다.
export function ProactiveSheet({ pref, hour, onSave, onClose }: ProactiveSheetProps): ReactNode {
  const chat = useUiCopy().messengerChat;
  const copy = chat.chatSettings.proactiveSheet;
  const [picked, setPicked] = useState(pref);
  const [pickedHour, setPickedHour] = useState(hour);
  const off = picked === "off";
  return (
    <view data-testid={ids.proactiveSheet}>
      <BottomSheet
        title={copy.title}
        closeAccessibilityLabel={copy.close}
        actions={[{ id: "save", label: copy.save, bindtap: () => onSave(picked, pickedHour) }]}
        ondismiss={onClose}
      >
        <view className="chat-settings-sheet">
          {/* 설명은 시트 description 자리가 아니라 여기 둡니다 — 그 자리는 기기에서 그려지지 않았다(ADR-0125). */}
          <text className="chat-settings-sheet-body" flatten={false} accessibility-element={true}>
            {copy.body}
          </text>
          <text
            className="chat-settings-sheet-label"
            flatten={false}
            accessibility-element={true}
            accessibility-heading={true}
          >
            {copy.howOften}
          </text>
          <view className="chat-settings-choices">
            {prefs.map((value) => (
              <ChoiceRow
                key={value}
                testId={ids.proactivePref(value)}
                title={copy.prefs[value]}
                selected={value === picked}
                onSelect={() => setPicked(value)}
              />
            ))}
          </view>
          <text
            className="chat-settings-sheet-label"
            flatten={false}
            accessibility-element={true}
            accessibility-heading={true}
          >
            {copy.preferredTime}
          </text>
          <view className="chat-settings-hours">
            {PROACTIVE_HOURS.map((value) => {
              const on = value === pickedHour;
              const label = value === null ? copy.anyTime : copy.hour(value);
              return (
                <view
                  key={value === null ? "any" : String(value)}
                  className={`chat-hour${on ? " chat-hour-on" : ""}${off ? " chat-hour-off" : ""}`}
                  data-testid={ids.proactiveHour(value)}
                  data-selected={on ? "true" : "false"}
                  flatten={false}
                  accessibility-element={true}
                  accessibility-label={on ? chat.toggle.selected(label) : label}
                  accessibility-traits={off ? "disabled" : "button"}
                  accessibility-role-description="radio"
                  accessibility-enable-tap={!off}
                  bindtap={
                    off
                      ? undefined
                      : () => {
                          "background only";
                          setPickedHour(value);
                        }
                  }
                >
                  <text
                    className={`chat-hour-text${on ? " chat-hour-text-on" : ""}`}
                    accessibility-element={false}
                  >
                    {label}
                  </text>
                </view>
              );
            })}
          </view>
          <text className="chat-settings-sheet-note" flatten={false} accessibility-element={true}>
            {copy.quietNote}
          </text>
        </view>
      </BottomSheet>
    </view>
  );
}
