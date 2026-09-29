import type { ReactNode } from "@lynx-js/react";
import lock from "@libitums/icons/lynx/lock";
import { color } from "@libitums/design-tokens";

import { useUiCopy } from "../../lib/ui-copy";
import { roleplayFormLabel, roleplayItemAccessibilityLabel } from "./roleplay-list";
import type { RoleplayCardProps } from "./roleplay-list.contract";

import "./roleplay-card.css";

/**
 * 롤플레이 항목 하나의 카드입니다(Figma 81-7985). 어두운 면 아래쪽에 제목과 형태 낱말이
 * 섭니다.
 *
 * **그림이 없습니다.** 디자인은 카드마다 인물 그림을 깔지만 그 자산이 아직 없어 색 면만
 * 그립니다. 아래쪽 그러데이션은 그대로 둡니다 — 그림이 오는 날 글자가 그 위에서 읽히게
 * 하는 것이 그 몫이고, 그날 바뀌는 것은 그림 한 겹이 더해지는 것뿐입니다.
 *
 * 세 형태는 상태 어휘 · 조작이 같고 다른 것은 데이터뿐이라 컴포넌트를 변형으로 가르지
 * 않습니다.
 */
export function RoleplayCard({ item, locked, layout, onSelect }: RoleplayCardProps): ReactNode {
  const copy = useUiCopy();
  const handleTap = () => {
    "background only";
    onSelect(item);
  };

  return (
    <view
      className={`roleplay-card roleplay-card-${layout}`}
      data-testid={`roleplay-list-item-${item.unitId}`}
      data-locked={locked ? "true" : "false"}
      accessibility-element={true}
      // 잠긴 카드는 버튼이 아닙니다 — 눌러도 아무 일이 없는 것을 버튼이라 읽히게 두지
      // 않습니다(여정의 잠긴 스텝과 같은 판단).
      accessibility-traits={locked ? "none" : "button"}
      accessibility-label={roleplayItemAccessibilityLabel(item, locked, copy)}
      bindtap={locked ? undefined : handleTap}
    >
      <view className="roleplay-card-shade" />
      <view className="roleplay-card-text">
        <text
          className="roleplay-card-title"
          data-testid={`roleplay-list-item-title-${item.unitId}`}
          text-maxline="2"
        >
          {item.title}
        </text>
        <text className="roleplay-card-form" data-testid={`roleplay-list-item-form-${item.unitId}`}>
          {roleplayFormLabel(item.form, copy)}
        </text>
      </view>
      {locked ? (
        <view
          className="roleplay-card-lock"
          data-testid={`roleplay-list-item-lock-${item.unitId}`}
          accessibility-elements-hidden={true}
        >
          <svg className="roleplay-card-lock-icon" content={lock} current-color={color.white} />
        </view>
      ) : null}
    </view>
  );
}
