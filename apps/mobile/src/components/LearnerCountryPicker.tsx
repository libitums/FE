import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft from "@libitums/icons/lynx/arrow-left-03";
import cross from "@libitums/icons/lynx/cross";
import search from "@libitums/icons/lynx/search";
import { OptionSelector } from "@libitums/ui-lynx/option-selector";
import { RoundButton } from "@libitums/ui-lynx/round-button";
import { SettingsGroup } from "@libitums/ui-lynx/settings-cell";
import { TextField } from "@libitums/ui-lynx/text-field";

import { announce } from "../lib/accessibility";
import {
  countrySearchAnnouncement,
  countrySearchHelper,
  learnerCountryAnnounceDelayMs,
} from "../lib/learner-profile-form";
import { useLayerBack } from "../lib/use-back-handler";
import { useUiCopy } from "../lib/ui-copy";
import type { LearnerCountryPickerProps } from "./learner-profile.contract";

import "../screens/login/login-screen.css";

const noop = () => undefined;

// 나라 고르기입니다 — 양식 자리에 대신 서는 화면입니다. 줄을 고르면 곧바로 확정하고 양식으로 돌아갑니다.
export function LearnerCountryPicker({ form, trailing }: LearnerCountryPickerProps): ReactNode {
  const copy = useUiCopy().learnerProfile;
  const { query } = form.draft;
  const { rows } = form;
  // 입력 칸이 비제어라 지우기는 키를 바꿔 다시 세웁니다.
  const [clears, setClears] = useState(0);
  const close = () => form.onEvent({ type: "picker-closed" });
  const choose = (code: string) => form.onEvent({ type: "country-chosen", code });

  // 시스템 뒤로 = 보이는 뒤로 — 고르지 않고 양식으로 돌아갑니다.
  useLayerBack(close);

  // 결과 수는 타자가 멈춘 뒤 한 번 읽습니다. 다시 치면 앞의 기다림을 버립니다.
  useEffect(() => {
    const message = countrySearchAnnouncement(query, rows.length, copy);
    if (message === null) return undefined;
    const timer = setTimeout(() => announce(message), learnerCountryAnnounceDelayMs);
    return () => clearTimeout(timer);
  }, [query, rows.length, copy]);

  const chosen = form.draft.countryCode;
  const selectedIds = chosen !== null && rows.some((row) => row.code === chosen) ? [chosen] : [];
  const only = rows.length === 1 ? rows[0] : undefined;

  return (
    <view className="learner-profile-picker" data-testid="learner-country-picker">
      <view className="learner-profile-header">
        <view data-testid="learner-country-picker-back">
          <RoundButton
            accessibilityLabel={copy.picker.back}
            icon={arrowLeft}
            variant="neutral"
            size="xl"
            bindtap={close}
          />
        </view>
        {trailing}
      </view>

      <text
        className="learner-profile-title"
        data-testid="learner-country-picker-title"
        flatten={false}
        accessibility-element={true}
        accessibility-heading={true}
        accessibility-traits="header"
      >
        {copy.picker.title}
      </text>

      <view data-testid="learner-country-picker-search">
        <TextField
          key={clears}
          accessibilityLabel={copy.picker.searchLabel}
          purpose="search"
          leading={{ kind: "icon", icon: search }}
          trailing={
            query === ""
              ? undefined
              : {
                  kind: "action",
                  icon: cross,
                  accessibilityLabel: copy.picker.clearSearch,
                  bindtap: () => {
                    setClears(clears + 1);
                    form.onEvent({ type: "query-changed", value: "" });
                  },
                }
          }
          supporting={{ kind: "helper", message: countrySearchHelper(query, rows.length, copy) }}
          bindinput={(value) => form.onEvent({ type: "query-changed", value })}
        />
      </view>

      <scroll-view
        className="learner-profile-scroll"
        data-testid="learner-country-picker-list"
        scroll-orientation="vertical"
        scroll-bar-enable={false}
      >
        <view>
          {only === undefined ? null : (
            // 목록 컴포넌트는 두 줄부터 서므로 결과가 하나뿐일 때는 이동 줄 하나로 보입니다.
            <SettingsGroup
              accessibilityLabel={copy.picker.title}
              items={[
                {
                  id: only.code,
                  trailing: "navigation",
                  title: only.en,
                  description: only.ko,
                  onNavigate: () => choose(only.code),
                },
              ]}
            />
          )}
          {rows.length < 2 ? null : (
            <OptionSelector
              groupLabel={copy.picker.title}
              options={rows.map((row) => ({
                id: row.code,
                label: copy.picker.row(row.en, row.ko),
                accessibilityLabel: row.en,
              }))}
              selectedIds={selectedIds}
              variant="outlined"
              size="s"
              selection="single"
              commit="immediate"
              onChange={noop}
              onCommit={choose}
            />
          )}
        </view>
      </scroll-view>
    </view>
  );
}
