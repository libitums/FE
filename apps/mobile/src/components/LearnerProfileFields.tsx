import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { SettingsGroup } from "@libitums/ui-lynx/settings-cell";
import { TextField } from "@libitums/ui-lynx/text-field";

import { LEARNER_NAME_MAX_LENGTH } from "../lib/learner-profile";
import { useUiCopy } from "../lib/ui-copy";
import type { LearnerProfileFieldsProps } from "./learner-profile.contract";

import "../screens/login/login-screen.css";
import "../screens/vocab-card/vocab-card-activity.css";

// 양식 묶음입니다 — 미리보기 상자 → 이름 칸 → 나라 줄. 나라 고르기에서 돌아오면 다시 마운트되고,
// 초안의 이름이 `defaultValue`로 섭니다.
export function LearnerProfileFields({ form }: LearnerProfileFieldsProps): ReactNode {
  const copy = useUiCopy().learnerProfile;
  const { kind, lines } = form.preview;
  // 입력 칸이 비제어라 마운트 때의 이름만 `defaultValue`로 넘깁니다 — 친 글자를 다시 밀어 넣지 않습니다.
  const [initialName] = useState(form.draft.name);

  return (
    <view className="learner-profile-fields" data-testid="learner-profile-fields">
      {lines.length === 0 ? null : (
        <view
          className="learner-profile-preview"
          data-testid="learner-profile-preview"
          data-kind={kind}
          flatten={false}
          accessibility-element={true}
          accessibility-label={copy.preview.label(
            kind,
            lines.map((line) => line.ko).join(" "),
            lines.map((line) => line.en).join(" "),
          )}
        >
          <text className="learner-profile-preview-title" accessibility-element={false}>
            {copy.preview.heading[kind]}
          </text>
          {lines.flatMap((line) => [
            <text
              key={`ko-${line.ko}`}
              className="learner-profile-preview-text"
              data-testid="learner-profile-preview-line"
              accessibility-element={false}
            >
              {line.ko}
            </text>,
            <text
              key={`en-${line.ko}`}
              className="learner-profile-preview-translation"
              data-testid="learner-profile-preview-line"
              accessibility-element={false}
            >
              {line.en}
            </text>,
          ])}
        </view>
      )}

      <view data-testid="learner-profile-name">
        <TextField
          label={copy.nameLabel}
          purpose="text"
          defaultValue={initialName}
          counter={{ maxLength: LEARNER_NAME_MAX_LENGTH }}
          supporting={
            form.nameIssueMessage === null
              ? undefined
              : { kind: "error", message: form.nameIssueMessage }
          }
          bindinput={(value) => form.onEvent({ type: "name-changed", value })}
        />
      </view>

      <SettingsGroup
        accessibilityLabel={copy.countryLabel}
        items={[
          {
            id: "country",
            trailing: "navigation",
            title: copy.countryLabel,
            description: form.selectedCountry?.en ?? copy.notSet,
            onNavigate: () => form.onEvent({ type: "picker-opened" }),
          },
        ]}
      />
      {form.countryIssue === null ? null : (
        <text
          className="learner-profile-country-error"
          data-testid="learner-profile-country-error"
          flatten={false}
          accessibility-element={true}
        >
          {copy.countryMissing}
        </text>
      )}
    </view>
  );
}
