import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft from "@libitums/icons/lynx/arrow-left-03";
import arrowRight from "@libitums/icons/lynx/arrow-right";
import { Button } from "@libitums/ui-lynx/button";
import { CompactNumericInput } from "@libitums/ui-lynx/compact-numeric-input";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import {
  formatVerificationCountdown,
  isVerificationCodeComplete,
  verificationCodeFrom,
  verificationCodeLength,
  verificationCodeValidSeconds,
} from "./verification-code";
import type { VerificationCodeScreenProps } from "./verification-code.contract";

import "./verification-code-screen.css";

// 완성 판정은 `verificationCodeFrom`·`isVerificationCodeComplete`가 집니다.
// `Continue`에 `disabled` trait을 붙이지 않습니다(ADR-0016 D10) — 미완성은
// `data-complete`로만 냅니다.
//
// 2026-09-21 디자인 반영: 머리는 로그인과 같은 형태입니다 — 좌상단 RoundButton
// 뒤로가기 → 제목 · 안내(caption) → 로그인에서 입력한 번호(label-l). 그 아래 한
// 자리 칸 넷(CompactNumericInput) → 5분 카운트다운 → 「Didn't receive the
// code?」 + Resend → Continue → 순서로 섭니다. 칸마다 숫자 하나만 받으므로
// (input-filter) 옛 TextField의 오류 채널은 없습니다.
const digitIndexes = Array.from({ length: verificationCodeLength }, (_, index) => index);

function digitSelector(index: number): string {
  return `.verification-code-screen-digit-${index} .ui-lynx-compact-numeric-input`;
}

// 숫자를 넣으면 다음 칸으로 포커스를 옮깁니다. 칸 컴포넌트가 포커스 API를 내지
// 않아 화면이 SelectorQuery로 네이티브 input의 focus를 부릅니다.
function focusDigit(index: number) {
  "background only";
  if (index >= verificationCodeLength) return;
  // 포커스 이동은 편의입니다 — 네이티브가 없는 곳(테스트 환경의 SelectorQuery는
  // invoke를 구현하지 않습니다)에서 실패해도 입력 자체는 그대로 됩니다.
  try {
    lynx.createSelectorQuery().select(digitSelector(index)).invoke({ method: "focus" }).exec();
  } catch {
    // 포커스를 옮기지 못해도 입력을 막지 않습니다.
  }
}

export function VerificationCodeScreen({
  phoneNumber,
  onSubmit,
  onExit,
}: VerificationCodeScreenProps): ReactNode {
  const [digits, setDigits] = useState<readonly string[]>(() => digitIndexes.map(() => ""));
  const code = verificationCodeFrom(digits.join(""));
  const complete = isVerificationCodeComplete(code);

  // 남은 초입니다. Resend가 `round`를 올려 처음부터 다시 셉니다.
  const [remaining, setRemaining] = useState(verificationCodeValidSeconds);
  const [round, setRound] = useState(0);
  useEffect(() => {
    setRemaining(verificationCodeValidSeconds);
    setDigits(digitIndexes.map(() => ""));
  }, [round]);

  // 0에 닿으면 타이머를 걸지 않습니다 — 다 센 뒤에도 매초 깨우지 않으려고 1초짜리
  // setTimeout을 남은 초마다 새로 겁니다.
  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => {
      setRemaining((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  function handleDigit(index: number, value: string) {
    setDigits((current) => current.map((digit, at) => (at === index ? value : digit)));
    if (value) focusDigit(index + 1);
  }

  function handleSubmit() {
    if (!complete) {
      return;
    }
    onSubmit();
  }

  return (
    <view className="verification-code-screen">
      <view className="verification-code-screen-header" data-testid="verification-code-screen-exit">
        <RoundButton
          accessibilityLabel="Back"
          icon={arrowLeft}
          variant="neutral"
          size="xl"
          bindtap={onExit}
        />
      </view>

      <scroll-view
        className="verification-code-screen-scroll"
        data-testid="verification-code-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        <view className="verification-code-screen-content">
          <view className="verification-code-screen-heading">
            <text
              className="verification-code-screen-title"
              data-testid="verification-code-screen-title"
              accessibility-traits="header"
            >
              Verification code OTP
            </text>
            <view className="verification-code-screen-sent">
              <text
                className="verification-code-screen-description"
                data-testid="verification-code-screen-description"
              >
                A verification code has been sent to
              </text>
              {phoneNumber ? (
                <text
                  className="verification-code-screen-phone"
                  data-testid="verification-code-screen-phone"
                >
                  {phoneNumber}
                </text>
              ) : null}
            </view>
          </view>

          {/* 재전송하면 `round`가 바뀌며 칸이 새로 마운트됩니다. 칸은 값을 스스로 들고 있어
              (비제어) 다시 마운트하지 않으면 지운 것이 화면에 남습니다. */}
          <view
            key={round}
            className="verification-code-screen-input"
            data-testid="verification-code-screen-input"
          >
            {digitIndexes.map((index) => (
              <view key={index} className={`verification-code-screen-digit-${index}`}>
                <CompactNumericInput
                  accessibilityLabel={`Digit ${index + 1} of ${verificationCodeLength}`}
                  size="l"
                  bindinput={(value) => handleDigit(index, value)}
                />
              </view>
            ))}
          </view>

          <view className="verification-code-screen-timing">
            <text
              className="verification-code-screen-timer"
              data-testid="verification-code-screen-timer"
            >
              {formatVerificationCountdown(remaining)}
            </text>

            <view className="verification-code-screen-resend">
              <text className="verification-code-screen-resend-hint">Didn't receive the code?</text>
              <view data-testid="verification-code-screen-resend">
                <Button
                  label="Resend"
                  variant="text"
                  size="s"
                  bindtap={() => setRound((value) => value + 1)}
                />
              </view>
            </view>
          </view>

          <view
            className="verification-code-screen-submit"
            data-testid="verification-code-screen-submit"
            data-complete={complete ? "true" : "false"}
          >
            <Button
              label="Continue"
              variant="brand"
              size="xl"
              width="fill"
              icon={arrowRight}
              iconPosition="trailing"
              bindtap={handleSubmit}
            />
          </view>
        </view>
      </scroll-view>
    </view>
  );
}
