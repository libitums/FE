import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import arrowDown from "@libitums/icons/lynx/arrow-down-03";
import arrowLeft from "@libitums/icons/lynx/arrow-left-03";
import arrowRight from "@libitums/icons/lynx/arrow-right";
import { Button } from "@libitums/ui-lynx/button";
import { RoundButton } from "@libitums/ui-lynx/round-button";
import { TextField } from "@libitums/ui-lynx/text-field";

import { announce } from "../../lib/accessibility";
import { authFailureMessage } from "../../lib/auth-failure";
import { useLayerBack, useScreenBack } from "../../lib/use-back-handler";
import {
  canRequestPhoneOtp,
  defaultLoginCountryId,
  isLoginBusy,
  loginHeading,
  loginMethodLabel,
  loginMethodStatus,
  loginStatusAfterEdit,
  loginStatusAfterSocialOutcome,
  phoneNumberFrom,
  type LoginCountry,
} from "./login";
import { loginCountries } from "./login-countries";
import { LoginCountrySheet } from "./LoginCountrySheet";
import { LoginLegalNotice } from "./LoginLegalNotice";
import { LoginSocialMethods } from "./LoginSocialMethods";
import type { LoginScreenProps, LoginStatus, SocialLoginMethod } from "./login.contract";

import "./login-screen.css";

// 2026-09-21 디자인 반영: 뒤로가기 → 제목·안내 → 국가+번호 입력 → Continue →
// or 구분선 → 플랫폼 버튼 셋 순서입니다. 번호는 Continue에서 국가 번호와 합쳐 인증
// 코드 요청으로만 나가고, 이 화면은 저장하지 않습니다. 소셜 버튼 묶음은
// `LoginSocialMethods`(S9)로 뗐습니다.

// 국가 목록은 ui-lynx OptionSelector(outlined · s · single · immediate)로
// 그립니다. 고르면 곧바로 확정하고 시트를 닫습니다.

export function LoginScreen({
  phoneSignIn,
  onSelectSocialMethod,
  onSubmitPhoneNumber,
  onBack,
  onOpenLegalDocument,
}: LoginScreenProps): ReactNode {
  const [country, setCountry] = useState<LoginCountry>(
    () =>
      loginCountries.find((option) => option.id === defaultLoginCountryId) ?? loginCountries[0]!,
  );
  const [countrySheetOpen, setCountrySheetOpen] = useState(false);
  // 국가 선택과 번호 입력이 한 칸이라, 포커스를 바깥 칸 테두리로 올립니다.
  const [phoneFocused, setPhoneFocused] = useState(false);
  // 입력한 번호입니다. 저장하지 않고, Continue에서 코드 요청으로만 나갑니다.
  const [phoneNumber, setPhoneNumber] = useState("");
  // 로그인 요청의 화면 로컬 상태입니다.
  const [status, setStatus] = useState<LoginStatus>({ kind: "idle" });
  const busy = isLoginBusy(status);
  const heading = loginHeading(phoneSignIn);
  const phone = phoneNumberFrom(country.dialCode, phoneNumber);
  const phoneBoxClass = phoneFocused
    ? "login-screen-phone login-screen-phone-focused"
    : "login-screen-phone";

  // 요청 중에는 국가·소셜·뒤로가기가 전부 무동작입니다.
  function guard(action: () => void): () => void {
    return () => {
      if (!busy) action();
    };
  }

  // 시스템 뒤로가기: 시트가 열려 있으면 시트만 닫고, 아니면 보이는 뒤로와 같은 함수입니다(요청 중 무동작).
  const handleBack = onBack ? guard(onBack) : null;
  const closeCountrySheet = () => setCountrySheetOpen(false);
  useScreenBack(handleBack);
  useLayerBack(countrySheetOpen ? closeCountrySheet : null);

  // 실패마다 정확히 한 번만 발화합니다 — `status`는 `setStatus`마다 새
  // 객체라 같은 실패로 다시 렌더돼도 재발화하지 않습니다.
  useEffect(() => {
    if (status.kind === "failed") {
      announce(authFailureMessage(status.reason));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // `failed`에서 번호·국가를 고치면 `idle`로 돌아갑니다(수단 무관 — 소셜 실패
  // 문구도 함께 걷힙니다).
  function handlePhoneInput(value: string) {
    setPhoneNumber(value);
    setStatus(loginStatusAfterEdit(status));
  }

  function handleCountryCommit(next: LoginCountry) {
    setCountry(next);
    setStatus(loginStatusAfterEdit(status));
  }

  async function handleSubmit() {
    if (!canRequestPhoneOtp(phone, status)) return;
    setStatus({ kind: "requesting", method: "phone" });
    const result = await onSubmitPhoneNumber(phone);
    if (result.status === "sent") setStatus({ kind: "idle" });
    else setStatus({ kind: "failed", method: "phone", reason: result.reason });
  }

  // `LoginSocialMethods`가 요청 중 탭을 이미 무시합니다(네 수단 상호 배제) — 여기서는
  // 계약대로 상태를 옮기고 결과를 반영합니다. `announce`는 기존 useEffect(수단
  // 무관)가 진다.
  function handleSocialSelect(method: SocialLoginMethod) {
    setStatus({ kind: "requesting", method });
    void (async () => {
      const outcome = await onSelectSocialMethod(method);
      setStatus(loginStatusAfterSocialOutcome(method, outcome));
    })();
  }

  return (
    <view className="login-screen">
      {/* 국가 선택 시트가 열린 동안 뒤쪽을 보조기술에서 가립니다(ADR-0016 D9). */}
      <view className="login-screen-body" accessibility-elements-hidden={countrySheetOpen}>
        <view className="login-screen-header" data-testid="login-screen-header">
          {handleBack ? (
            <RoundButton
              accessibilityLabel="Back"
              icon={arrowLeft}
              variant="neutral"
              size="xl"
              bindtap={handleBack}
            />
          ) : null}
        </view>

        <scroll-view
          className="login-screen-scroll"
          data-testid="login-screen-scroll"
          scroll-orientation="vertical"
          scroll-bar-enable={false}
        >
          <view className="login-screen-content">
            <view className="login-screen-heading">
              <text
                className="login-screen-title"
                data-testid="login-screen-title"
                flatten={false}
                accessibility-element={true}
                accessibility-heading={true}
                accessibility-traits="header"
              >
                {heading.title}
              </text>
              <text className="login-screen-caption" flatten={false} accessibility-element={true}>
                {heading.caption}
              </text>
            </view>

            {/* 전화번호 수단입니다. 숨기면 소셜 셋만 섭니다(`productPhoneSignIn`). */}
            {phoneSignIn === "visible" ? (
              <>
                {/* 국가 선택 | 구분선 | 번호 입력을 한 칸으로 합칩니다. */}
                <view className={phoneBoxClass}>
                  <view
                    className="login-screen-country"
                    data-testid="login-screen-country"
                    accessibility-element={true}
                    accessibility-label={`Country code, ${country.name} ${country.dialCode}`}
                    accessibility-traits="button"
                    bindtap={guard(() => setCountrySheetOpen(true))}
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
                      bindinput={handlePhoneInput}
                    />
                  </view>
                </view>

                {/* 전화번호 실패 문구입니다 — 소셜 실패는 소셜 셋 아래 자리에 섭니다. */}
                {status.kind === "failed" && status.method === "phone" ? (
                  <text
                    className="login-screen-error"
                    data-testid="login-screen-error"
                    flatten={false}
                    accessibility-element={true}
                  >
                    {authFailureMessage(status.reason)}
                  </text>
                ) : null}

                <view
                  className="login-screen-method"
                  data-testid="login-screen-method-phone"
                  data-complete={phone !== null ? "true" : "false"}
                  data-status={loginMethodStatus(status, "phone")}
                >
                  <Button
                    label={loginMethodLabel("phone")}
                    variant="brand"
                    size="xl"
                    width="fill"
                    icon={arrowRight}
                    iconPosition="trailing"
                    loading={loginMethodStatus(status, "phone") === "requesting"}
                    bindtap={() => void handleSubmit()}
                  />
                </view>

                <view className="login-screen-separator">
                  <view className="login-screen-separator-line" />
                  <text className="login-screen-separator-label">or</text>
                  <view className="login-screen-separator-line" />
                </view>
              </>
            ) : null}

            <LoginSocialMethods status={status} onSelect={handleSocialSelect} />

            {/* 소셜 실패 문구입니다 — 같은 testid를 재사용합니다(새 testid 없이
                ). 자리와 가운데 정렬만 새 클래스로 다릅니다. */}
            {status.kind === "failed" && status.method !== "phone" ? (
              <text
                className="login-screen-error login-screen-social-error"
                data-testid="login-screen-error"
                flatten={false}
                accessibility-element={true}
              >
                {authFailureMessage(status.reason)}
              </text>
            ) : null}

            <LoginLegalNotice onOpenLegalDocument={onOpenLegalDocument} />
          </view>
        </scroll-view>
      </view>

      {countrySheetOpen ? (
        <LoginCountrySheet
          selected={country}
          onCommit={handleCountryCommit}
          onClose={closeCountrySheet}
        />
      ) : null}
    </view>
  );
}
