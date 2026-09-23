import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import arrowDown from "@libitums/icons/lynx/arrow-down-03";
import arrowLeft from "@libitums/icons/lynx/arrow-left-03";
import arrowRight from "@libitums/icons/lynx/arrow-right";
import { BottomSheet } from "@libitums/ui-lynx/bottom-sheet";
import { Button } from "@libitums/ui-lynx/button";
import { Fog } from "@libitums/ui-lynx/fog";
import { OptionSelector } from "@libitums/ui-lynx/option-selector";
import { RoundButton } from "@libitums/ui-lynx/round-button";
import { TextField } from "@libitums/ui-lynx/text-field";

import type { EntryLoginMethod } from "../../lib/entry-flow";
import { entryLoginMethods } from "../../lib/entry-flow";
import { defaultLoginCountryId, loginMethodLabel, type LoginCountry } from "./login";
import { loginCountries } from "./login-countries";
import type { LoginScreenProps } from "./login.contract";
import { appleLogo, facebookLogo, googleLogo } from "./login-logos";

import "./login-screen.css";

// 2026-09-21 디자인 반영: 좌상단 뒤로가기 → 제목 · 안내 → 국가 선택 + 전화번호 입력 →
// Continue(`phone`) → 좌우 구분선이 있는 or → 플랫폼 버튼 셋(Apple · Google · Facebook)
// 순서로 섭니다. 수단 넷의 DOM 순서가 `entryLoginMethods` 순서입니다.
//
// 전화번호 입력값과 국가 선택은 어디에도 저장·전송되지 않습니다.
const socialMethods = entryLoginMethods.filter((method) => method !== "phone");

const socialLogo: Record<Exclude<EntryLoginMethod, "phone">, string> = {
  apple: appleLogo,
  google: googleLogo,
  facebook: facebookLogo,
};

// 국가 목록은 ui-lynx OptionSelector(outlined · s · single · immediate)로 그립니다.
// 선택지 라벨은 한 줄 글자라 국기 · 이름 · 국가 번호를 한 라벨로 잇습니다. 고르면
// 곧바로 확정하고 시트를 닫습니다.
const countryOptions = loginCountries.map((option) => ({
  id: option.id,
  label: `${option.flag}  ${option.name}  ${option.dialCode}`,
  // 국기 이모지는 스크린 리더가 「○○ 국기」로 읽어 이름이 겹칩니다 — 이름에서는
  // 뺍니다.
  accessibilityLabel: `${option.name} ${option.dialCode}`,
}));

// immediate 확정이라 선택 바뀜은 `onCommit`에서 한 번에 처리합니다.
const noop = () => undefined;

export function LoginScreen({ onSelectMethod, onBack }: LoginScreenProps): ReactNode {
  const [country, setCountry] = useState<LoginCountry>(
    () =>
      loginCountries.find((option) => option.id === defaultLoginCountryId) ?? loginCountries[0]!,
  );
  // 국가 목록을 내렸는지입니다 — 위쪽 Fog는 내렸을 때만 보입니다.
  const [countryListScrolled, setCountryListScrolled] = useState(false);
  const [countrySheetOpen, setCountrySheetOpen] = useState(false);
  // 국가 선택과 번호 입력이 한 칸이라, 안쪽 TextField의 포커스를 바깥 칸 테두리로
  // 올립니다.
  const [phoneFocused, setPhoneFocused] = useState(false);
  // 입력한 번호입니다. 코드 검증 화면에 보여 주려고 Continue와 함께 올립니다
  // (저장·전송하지 않습니다).
  const [phoneNumber, setPhoneNumber] = useState("");

  return (
    <view className="login-screen">
      {/* 국가 선택 시트가 열린 동안 뒤쪽을 보조기술에서 가립니다(ADR-0016 D9). */}
      <view className="login-screen-body" accessibility-elements-hidden={countrySheetOpen}>
        <view className="login-screen-header" data-testid="login-screen-header">
          {onBack ? (
            <RoundButton
              accessibilityLabel="Back"
              icon={arrowLeft}
              variant="neutral"
              size="xl"
              bindtap={onBack}
            />
          ) : null}
        </view>

        <scroll-view
          className="login-screen-scroll"
          data-testid="login-screen-scroll"
          scroll-orientation="vertical"
          scroll-bar-enable={true}
        >
          <view className="login-screen-content">
            <view className="login-screen-heading">
              <text
                className="login-screen-title"
                data-testid="login-screen-title"
                accessibility-traits="header"
              >
                Log in or Sign up with your phone number
              </text>
              <text className="login-screen-caption">
                Please enter your phone number to continue
              </text>
            </view>

            {/* 국가 선택 | 구분선 | 번호 입력을 한 칸으로 합칩니다. 칸의 테두리는 이
                행이 지고, 안쪽 TextField는 테두리 없이 입력만 맡습니다. */}
            <view
              className={
                phoneFocused
                  ? "login-screen-phone login-screen-phone-focused"
                  : "login-screen-phone"
              }
            >
              <view
                className="login-screen-country"
                data-testid="login-screen-country"
                accessibility-element={true}
                accessibility-label={`Country code, ${country.name} ${country.dialCode}`}
                accessibility-traits="button"
                bindtap={() => setCountrySheetOpen(true)}
              >
                <text className="login-screen-country-flag">{country.flag}</text>
                <text className="login-screen-country-code">{country.dialCode}</text>
                <svg
                  className="login-screen-country-chevron"
                  content={arrowDown}
                  current-color={color.gray["600"]}
                />
              </view>
              <view className="login-screen-phone-divider" />
              <view className="login-screen-phone-field" data-testid="login-screen-phone-field">
                <TextField
                  accessibilityLabel="Phone number"
                  placeholder="10 1234 5678"
                  purpose="telephone"
                  availability="enabled"
                  bindfocus={() => setPhoneFocused(true)}
                  bindblur={() => setPhoneFocused(false)}
                  bindinput={setPhoneNumber}
                />
              </view>
            </view>

            <view className="login-screen-method" data-testid="login-screen-method-phone">
              <Button
                label={loginMethodLabel("phone")}
                variant="brand"
                size="xl"
                width="fill"
                icon={arrowRight}
                iconPosition="trailing"
                bindtap={() =>
                  onSelectMethod(
                    "phone",
                    phoneNumber.trim() ? `${country.dialCode} ${phoneNumber.trim()}` : undefined,
                  )
                }
              />
            </view>

            <view className="login-screen-separator">
              <view className="login-screen-separator-line" />
              <text className="login-screen-separator-label">or</text>
              <view className="login-screen-separator-line" />
            </view>

            <view className="login-screen-methods">
              {socialMethods.map((method) => (
                <view
                  key={method}
                  className="login-screen-method login-screen-social"
                  data-testid={`login-screen-method-${method}`}
                >
                  {/* Apple만 gray.900 면(neutral)이고, 나머지는 경계만 있는
                      outline입니다. */}
                  <Button
                    label={loginMethodLabel(method)}
                    variant={method === "apple" ? "neutral" : "outline"}
                    size="xl"
                    width="fill"
                    icon={socialLogo[method as Exclude<EntryLoginMethod, "phone">]}
                    iconPosition="leading"
                    bindtap={() => onSelectMethod(method)}
                  />
                </view>
              ))}
            </view>

            {/* 약관 안내입니다. 두 문서 이름만 짙은 색(gray.800)으로 구분합니다 —
                굵기는 같고, 지금은 누를 수 있는 링크가 아닙니다. */}
            <text className="login-screen-legal" data-testid="login-screen-legal">
              <text className="login-screen-legal-text">{"By signing up, you agree to the\n"}</text>
              <text className="login-screen-legal-emphasis">User Agreement</text>
              <text className="login-screen-legal-text"> & </text>
              <text className="login-screen-legal-emphasis">Privacy Policy</text>
            </text>
          </view>
        </scroll-view>
      </view>

      {countrySheetOpen ? (
        <BottomSheet
          title="Select country"
          closeAccessibilityLabel="Close"
          ondismiss={() => {
            setCountrySheetOpen(false);
            setCountryListScrolled(false);
          }}
        >
          {/* 국가 번호가 있는 모든 지역(245)을 OptionSelector로 늘어놓습니다. 고른
              국가만 ✓로 표시합니다. 목록은 스크롤하고, 가장자리 Fog가 이어짐을
              알립니다(Fog는 스크롤 밖입니다). */}
          <view className="login-screen-country-list">
            <scroll-view
              className="login-screen-country-scroll"
              data-testid="login-screen-country-list"
              scroll-orientation="vertical"
              bindscroll={(event: { detail: { scrollTop: number } }) =>
                setCountryListScrolled(event.detail.scrollTop > 0)
              }
            >
              <OptionSelector
                groupLabel="Select country"
                options={countryOptions}
                selectedIds={[country.id]}
                variant="outlined"
                size="s"
                selection="single"
                commit="immediate"
                onChange={noop}
                onCommit={(id) => {
                  const next = loginCountries.find((option) => option.id === id);
                  if (next) setCountry(next);
                  setCountrySheetOpen(false);
                  setCountryListScrolled(false);
                }}
              />
            </scroll-view>
            <Fog
              direction="top"
              size="s"
              color="white"
              visibility={countryListScrolled ? "visible" : "hidden"}
            />
            <Fog direction="bottom" size="s" color="white" />
          </view>
        </BottomSheet>
      ) : null}
    </view>
  );
}
