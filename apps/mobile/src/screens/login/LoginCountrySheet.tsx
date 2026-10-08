import { useGlobalProps, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { BottomSheet } from "@libitums/ui-lynx/bottom-sheet";
import { Fog } from "@libitums/ui-lynx/fog";
import { OptionSelector } from "@libitums/ui-lynx/option-selector";

import { tappableBottomInsetFrom } from "../../lib/safe-area";
import { loginCountries, loginCountryOptions } from "./login-countries";
import type { LoginCountry } from "./login";

const noop = () => undefined;

type LoginCountrySheetProps = {
  readonly selected: LoginCountry;
  /** 고른 국가를 확정합니다. 시트를 닫는 일은 `onClose`가 합니다. */
  readonly onCommit: (country: LoginCountry) => void;
  readonly onClose: () => void;
};

/**
 * 국가 선택 시트입니다(`LoginScreen`에서 뗐습니다 — 300줄 한도). 국가 목록은 ui-lynx
 * OptionSelector(outlined · s · single · immediate)로 그리고, 고르면 곧바로 확정하고
 * 닫습니다. 목록을 내렸는지(위쪽 Fog)는 시트가 서 있는 동안만 이 컴포넌트가 가집니다.
 */
export function LoginCountrySheet({
  selected,
  onCommit,
  onClose,
}: LoginCountrySheetProps): ReactNode {
  const [listScrolled, setListScrolled] = useState(false);
  // 설문 시트와 같은 이유입니다 — Android 3버튼 바가 가리는 높이만큼 시트 아래를 비웁니다(iOS · 제스처는 0).
  const tappableBottom = tappableBottomInsetFrom(useGlobalProps());
  return (
    <BottomSheet title="Select country" closeAccessibilityLabel="Close" ondismiss={onClose}>
      {/* 국가 번호가 있는 모든 지역(245)을 OptionSelector로 늘어놓습니다. */}
      <view className="login-screen-country-list">
        <scroll-view
          className="login-screen-country-scroll"
          data-testid="login-screen-country-list"
          scroll-orientation="vertical"
          bindscroll={(event: { detail: { scrollTop: number } }) =>
            setListScrolled(event.detail.scrollTop > 0)
          }
        >
          <OptionSelector
            groupLabel="Select country"
            options={loginCountryOptions}
            selectedIds={[selected.id]}
            variant="outlined"
            size="s"
            selection="single"
            commit="immediate"
            onChange={noop}
            onCommit={(id) => {
              const next = loginCountries.find((option) => option.id === id);
              if (next) onCommit(next);
              onClose();
            }}
          />
        </scroll-view>
        <Fog
          direction="top"
          size="s"
          color="white"
          visibility={listScrolled ? "visible" : "hidden"}
        />
        <Fog direction="bottom" size="s" color="white" />
      </view>
      {tappableBottom > 0 ? (
        <view
          data-testid="login-screen-country-inset"
          style={{ height: `${tappableBottom}px`, flexShrink: 0 }}
        />
      ) : null}
    </BottomSheet>
  );
}
